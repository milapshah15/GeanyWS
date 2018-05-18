(function executionBotAction(params) {
	
	/**
	 * Author : Milap - 03/06
	 * This action is used to initiate a credit card request either it could be new or replacement
	**/

	var message = '';
		
	//Get the reference of the current logged in user
	var userObj = new GlideRecord('sys_user');
	userObj.get(gs.getUserID());
	
	this.opened_by = gs.getProperty('v_bot_arica');
	
	/**
	 * Create Finance request of 
	 * service - "Credit card"
	 * Sub-service - PCard Inquiries
    **/

	var financeGr = new GlideRecord('sn_sm_finance_request');
	financeGr.initialize();
	financeGr.u_service = params['service'];
	financeGr.u_sub_service = params['subservice'];
	financeGr.u_request_type1 = params['request_type'];
	financeGr.u_card_type = params['card_type'];
	financeGr.u_new_replacement = params['replacement'];
	financeGr.u_amount_requested = params['amount'];
	financeGr.short_description = params['short_description'];
	financeGr.description = getConversationSummary();
	financeGr.insert();
	var requestNumber = financeGr.getValue('number');
	var requestSysId = financeGr.getValue('sys_id');
	
	/**
	 * getConversationSummary:
	 * This function helps to get the conversation summary appending last message
	 * from the conversation as the last message is not captured in conversation summary
	**/
	  
	function getConversationSummary() {
		var conversationSummary = params['conversation_summary'];
		var chatMessageGr = new GlideRecord('u_ibm_watson_chat_message'); 
		chatMessageGr.addQuery('u_sender',params['user_id'] );
		chatMessageGr.orderByDesc('sys_created_on');
		chatMessageGr.query();
		if(chatMessageGr.next()){
			conversationSummary = conversationSummary.replaceAll("ITSM-Bot","Arica");
			conversationSummary += (conversationSummary ? '\n\n' : '') + User.first_name + ': ' + lastChatMessage.u_message;
		}
		return conversationSummary;
	}
	
	//Prepare the return message
	var message = '';
	message = 'Request'+ ' ' + '<a href="sn_sm_finance_request.do?sys_id=' + requestSysId +'" target="_blank" data-mce-href="incident.do?sys_id='+ requestSysId +'"> ' + requestNumber + ' </a>' + 'has been created on your behalf.  A technician will get back to you as soon as possible. Is there anything else I can help you with?';

	return { message: message, sys_id: requestSysId };
	
})(params);
