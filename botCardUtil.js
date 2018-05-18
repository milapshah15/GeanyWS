var BotCardsUtil = Class.create();
BotCardsUtil.prototype = {
	
    initialize: function(userID) {
		this.cards = [];
		this.userObj = new GlideRecord('sys_user');
		if (JSUtil.notNil(userID))
			this.userObj.get(userID);
		else
			this.userObj.get(gs.getUserID());
		
		//Define Constants weights for each type of ranking
		this.USAGEWEIGHT = 1;
		this.TIMEWEIGHT = 25;
		
    },
    
    /**
	 * Author : Milap Shah - 03/19
	 * Description : This utility is used to evaluate the card template script and return the result to the Chat bot widget
	**/ 

	processCards : function(category) {
		var card = {};
		this.cardIds = [];
		var cardsGr = new GlideRecord('u_chat_bot_cards');
		if (category == 'trending')
			category = 'trending,activity';
		cardsGr.addEncodedQuery('u_active=true^u_categoryIN' + category);
		cardsGr.orderByDesc('u_global_rank');
		cardsGr.query();
		while (cardsGr.next() && this.cards.length < 5) {
			
			try {
				
				//Evaluate user criteria
				if (!this._evaluateUserCriteria(cardsGr.getValue('sys_id')))
					continue;
				
				//Check if the user dislike this card
				if (this._checkForMyDislike(cardsGr.getValue('sys_id')))
					continue;
				
				var evaluator = new GlideScopedEvaluator();
				evaluator.putVariable('result', {});
				evaluator.evaluateScript(cardsGr, 'u_qualify_script', null);
				result = evaluator.getVariable('result');
				
				if (result.qualify == true) {
					card.card_display_name = cardsGr.getValue('u_display_name');
					card.sys_id = cardsGr.getValue('sys_id');
					card.card_name = cardsGr.getValue('u_card_name');
					card.order = cardsGr.getValue('u_global_rank');
					card.score = cardsGr.getValue('u_global_rank');
					for (var key in result) 
						card[key] = result[key];
					this.cardIds.push(card.sys_id);
					this.cards.push(card);
				}
				
			} catch (err) {
				gs.error('Exception:' + err.getMessage());
			}

			card = {};
			
		}
		//Add User Personal Ranking to the cards
		this.calcUserRank();
		return this.cards;
		
	},
	
	/**
	 * Author : Milap Shah - 04/02
	 * Description : Calculate Card global ranking
	 * Priority Based : Critical - 25, High - 15, Medium - 10, Low - 5
	 * Time Based : 25
	 * Usage Based : 1 per each use (last week usage)
	 * User Search : Matching search history with card record.Check cards table to see weights assigned to each field
	 */
	 
	 rankMe : function() {
		 var cardGr = new GlideRecord('u_chat_bot_cards');
		 cardGr.addEncodedQuery('u_active=true');
		 cardGr.query();
		 while (cardGr.next()) {
			 cardGr.u_global_rank = this._getTotalWeight(cardGr).toString();
			 cardGr.update();
		 }
		 
	 },
	
	 _getTotalWeight : function (cardGr) {
		 return parseInt(this._getPriorityWeight(cardGr)) + parseInt(this._getUsageWeight(cardGr)) + parseInt(this._getDurationWeight(cardGr));
	 },
	 
	 _getPriorityWeight : function (cardGr) {
		 return cardGr.getValue('u_priority');
	 },
	 
	 _getUsageWeight : function (cardGr) {
		 var cardsUsageGr = new GlideAggregate('u_m2m_users_chat_bot_cards');
		 cardsUsageGr.addEncodedQuery('u_chat_bot_cards=' + cardGr.getValue('sys_id') + '^sys_created_onONLast week@javascript:gs.beginningOfLastWeek()@javascript:gs.endOfLastWeek()');
		 cardsUsageGr.addAggregate('COUNT');
		 cardsUsageGr.query();
		 if (cardsUsageGr.next())
			return cardsUsageGr.getAggregate('COUNT') * this.USAGEWEIGHT;

		 return 0; 
	 },
	 
	 /** Author : Milap Shah - 04/05
	  *  Description : This method scans through user's this week search and add to the card scoring
	  */
	 
	 calcUserRank : function () {
		 var cardScores = this._calcCardUserScores();	
		 for (var card in this.cards) {
			 this.cards[cards].score = parseInt(this.cards[cards].score) + parseInt(cardsScores[this.cards[cards].sys_id]);
		 }
		  
	 },
	 
	 _calcCardUserScores : function () {
		var textSearchGr = new GlideAggregate('text_search');
		textSearchGr.addEncodedQuery('sys_created_onONThis week@javascript:gs.beginningOfThisWeek()@javascript:gs.endOfThisWeek()^user=' + this.userObj.getValue('sys_id'));
		textSearchGr.groupBy('search_term');
		textSearchGr.query();
		var cardScore = [];
		while (textSearchGr.next()) {
			var botCardGr = new GlideRecord('u_chat_bot_cards');
			botCardGr.addQuery('IR_AND_OR_QUERY',textSearchGr.getValue('search_term'));
			botCardGr.addQuery('active',true);
			botCardGr.addQuery('sys_id','IN',this.cardIds.toString());
			botCardGr.query();
			while (botCardGr.next()) {
				if (!cardScore[botCardGr.getValue('sys_id')])
					cardScore[botCardGr.getValue('sys_id')] = 0;
			
				cardScore[botCardGr.getValue('sys_id')] += parseInt(botCardGr.ir_query_score.getDisplayValue());
			}
		}
		return cardScore;
	 },
	 
	 _getDurationWeight : function (cardsGr) {
		 
		if (JSUtil.notNil(cardsGr.u_start_date) && JSUtil.notNil(cardsGr.u_end_date)) {
			var todaysdate = gs.now();
			var valid_from = new GlideDateTime(cardsGr.u_start_date);
			var valid_to = new GlideDateTime(cardsGr.u_end_date);
			var inRange = (todaysdate >= valid_from && todaysdate <= valid_to)? true: false;

			if (inRange){
				return this.TIMEWEIGHT;
			}
		}
			
		return 0;
	 },
	 
	 
	/**
	 * Author : Milap Shah - 03/20
	 * Description : Update the card usage by updating user using the card in m2m table
	**/ 
	
	updateCardUsage : function(card) {
	
		//Record the card usage in history
		var m2mCardGr = new GlideRecord('u_m2m_users_chat_bot_cards');
		m2mCardGr.initialize();
		m2mCardGr.u_chat_bot_cards = card;
		m2mCardGr.u_user = this.userObj.getValue('sys_id');
		m2mCardGr.insert();
	},
	
	/**
	 * Author : Milap Shah - 03/22
	 * Description : Check if the card is used by the user , if yes , do not show the card
	**/ 
	
	checkCardIsUsed : function(card) {
	
		//Record the card usage in history
		var m2mCardGr = new GlideRecord('u_m2m_users_chat_bot_cards');
		m2mCardGr.addEncodedQuery('u_chat_bot_cards=' + card + '^u_user=' + this.userObj.getValue('sys_id'));
		m2mCardGr.query();
		return m2mCardGr.hasNext();
	},
	
	/**
	 * Author : Milap Shah - 03/20
	 * Description : Using OOTB Preferences table to remember what user dislike
	**/
	
	rememberMyPref : function(card) {
		
		var cardObj = this._getCardObj(card);
		
		//Update the User preference
		var userPrefGr = new GlideRecord('sys_user_preference');
		userPrefGr.initialize();
		userPrefGr.type = 'string';
		userPrefGr.name = 'Bot - ' + cardObj.getValue('u_card_name');
		userPrefGr.user = this.userObj.getValue('sys_id');
		userPrefGr.value = card;
		
	},
	
	/**
	 * Author : Milap Shah - 03/20
	 * Description : Evaluate user criteria for the card slected
	**/
	
	_evaluateUserCriteria : function(cardID) {
		var criteriaGr = new GlideRecord('u_m2m_user_criteri_chat_bot_c');
		criteriaGr.addEncodedQuery('u_chat_bot_cards=' + cardID);
		criteriaGr.query();
		if (!criteriaGr.hasNext())
			return true;

		while (criteriaGr.next()) {
			var criteriaUtil = new UserCriteriaUtil(criteriaGr.getValue('u_user_criteria'));
			if (criteriaUtil.check() == true)
				return true;
		}
		return false;
	},
	
	/**
	 * Author : Milap Shah - 03/22
	 * Description : Check if user has ever dislike this card
	**/
	
	_checkForMyDislike : function(card) {
		
		//var cardObj = this._getCardObj(card);
		
		//Update the User preference
		var userPrefGr = new GlideRecord('sys_user_preference');
		userPrefGr.addEncodedQuery('user=' + this.userObj.getValue('sys_id') + '^value=' + card);
		userPrefGr.query();
		return userPrefGr.hasNext();
		
	},
	
	/**
	 * Author : Milap Shah - 03/20
	 * Description : Get card Object
	**/
	
	_getCardObj : function(card) {
		var cardGr = new GlideRecord('u_chat_bot_cards');
		cardGr.get(card);
		return cardGr;
	},
	
	
    type: 'BotCardsUtil'
};
