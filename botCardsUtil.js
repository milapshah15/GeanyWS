var BotCardsUtil = Class.create();
BotCardsUtil.prototype = {
	
	/**
	 * Author : Milap Shah - 03/19
	 * Description : This utility is used to evaluate the card template script and return the result to the Chat bot widget
	**/ 
	 
    initialize: function() {
		this.cards = [];
    },

	processCards : function() {
		var card = {};
		var cardsGr = new GlideRecord('u_chat_bot_cards');
		cardsGr.addQuery('u_active',true);
		cardsGr.orderBy('u_order');
		cardsGr.query();
		while (cardsGr.next() && this.cards.length < 5) {
			
			try {
				
				//Evaluate user criteria - Start
				if (JSUtil.notNil(cardsGr.getValue('u_user_criteria')) && !this.evaluateUserCriteria(cardsGr.getValue('u_user_criteria')))
					continue;
				//Evaluate user criteria - End
				
				var evaluator = new GlideScopedEvaluator();
				evaluator.putVariable('result', {});
				evaluator.evaluateScript(cardsGr, 'u_qualify_script', null);
				result = evaluator.getVariable('result');
				
				if (result.qualify == true) {
					card.card_display_name = cardsGr.getValue('u_display_name');
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
		
		return new JSON().encode(this.cards);
		
	},
	
	evaluateUserCriteria : function(cardsGr) {
		var criteriaUtil = new UserCriteriaUtil('USER CRITERIA SYS_ID');
		return criteriaUtil.check();
	},
	
	cardToHistory : function() {
		//Record the card usage in history
	},
	
	updateUserPref : function() {
		//Update the User preference
	},
	
	
    type: 'BotCardsUtil'
};
