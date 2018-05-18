(function executeRule(current, previous /*null when async*/) {

	var ConnectUtil = new sn_itsm_chatbot.ConnectBotUtil();
	var api = new sn_itsm_chatbot.BotConversationAPI(ConnectUtil.CONSTANTS.BOT.SERVICE, ConnectUtil.CONSTANTS.BOT.NAME);
	var response ;
	try {
		response = api.send(current.u_message.toString());
		gs.info("Communicate with IBM Watson : Response "+response.output,"Watson");
	} catch(e) {
		gs.info("Communicate with IBM Watson : error " + e,"Watson");
	}

    //Sys Id for the bot user "Arica"
    var bot_user = '39365c8adb568f00a3ab56a8dc961942';
	var gr = new GlideRecord('u_ibm_watson_chat_message');
	gr.initialize();
	gr.u_sender = bot_user;

	if (global.JSUtil.nil(response.output)) {
		gr.u_message = "Sorry, I didn't understand you. I'm still learning, could you please rephrase it.";
	} else {
		if (response.context.widget) {
			gr.u_type = 2;
			gr.u_message = response.output;
			gr.u_json_message = JSON.stringify({
				widget : response.context.widget_id,
				options : response.context.widget_options
			});
		} else {
			gr.u_message = response.output;
		}
	}

	gr.u_recipient = gs.getUserID();
	gr.u_active = true;
	var message = gr.insert();

})(current, previous);

