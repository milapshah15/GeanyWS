var BotCardsUtil = Class.create();
BotCardsUtil.prototype = {
	
    initialize: function(userID) {
		this.cards = [];
		this.userObj = new GlideRecord('sys_user');
		if (JSUtil.notNil(userID))
			this.userObj.get(userID);
		else
			this.userObj.get(gs.getUserID());
    },
    
    /**
	 * Author : Milap Shah - 03/19
	 * Description : This utility is used to evaluate the card template script and return the result to the Chat bot widget
	**/ 

	processCards : function(category) {
		var card = {};
		var cardsGr = new GlideRecord('u_chat_bot_cards');
		cardsGr.addEncodedQuery('u_active=true^u_category=' + category);
		cardsGr.orderBy('u_order');
		cardsGr.query();
		while (cardsGr.next() && this.cards.length < 5) {
			
			try {
				
				//Evaluate user criteria
				if (JSUtil.notNil(cardsGr.getValue('u_user_criteria')) && !this.evaluateUserCriteria(cardsGr.getValue('u_user_criteria')))
					continue;
				
				//Check if the user dislike this card
				if (this._checkForMyDislike(cardsGr.getValue('sys_id')))
					continue;
				
				//Check if the user dislike this card
				/*if (this.checkCardIsUsed(cardsGr.getValue('sys_id')))
					continue;*/
				
				var evaluator = new GlideScopedEvaluator();
				evaluator.putVariable('result', {});
				evaluator.evaluateScript(cardsGr, 'u_qualify_script', null);
				result = evaluator.getVariable('result');
				
				if (result.qualify == true) {
					card.card_display_name = cardsGr.getValue('u_display_name');
					card.sys_id = cardsGr.getValue('sys_id');
					card.card_name = cardsGr.getValue('u_card_name');
					card.order = cardsGr.getValue('u_order');
					for (var key in result) 
						card[key] = result[key];
					this.cards.push(card);
				}
				
			} catch (err) {
				gs.error('Exception:' + err.getMessage());
			}

			card = {};
			
		}
		return this.cards;
		
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
	
	/**Author: Milap 03/21
	 * Description: This method checks the 2 weeks usage of each card assign them a global ranking
	**/ 
	
	rankMe : function() {
		var cardGr = new GlideRecord('u_chat_bot_cards');
		cardGr.addQuery(true);
		cardGr.query();
		while (cardGr.next()) {
			var m2mGr = new GlideAggregate('u_m2m_users_chat_bot_cards');
			m2mGr.addEncodedQuery('sys_created_onONLast 15 days@javascript:gs.beginningOfLast30Days()@javascript:gs.endOfLast30Days()^u_chat_bot_cards=' + cardGr.getUniqueValue());
			m2mGr.addAggregate('COUNT');
			m2mGr.query();
			m2mGr.next();
			cardsGr.u_order = m2mGr.getAggregate('COUNT');
			cardsGr.update();
		}
		
	},
	
	/**
	 * Author : Milap Shah - 03/20
	 * Description : Evaluate user criteria for the card slected
	**/
	
	_evaluateUserCriteria : function(criteriaId) {
		var criteriaUtil = new UserCriteriaUtil(criteriaId);
		return criteriaUtil.check();
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
