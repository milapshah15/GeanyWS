(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
	
	var payload = request.body.dataString;
	var eventType;
	var inbox;
	
	if (request.getHeader('Content-Type') == 'application/xml') {
		
		//Start Parsing an store it in the Universal Inbox - Events table
		var xmlDoc = new XMLDocument2();
		xmlDoc.parseXML(payload);
		
		payload = xmlDoc.toString();
		eventType = xmlDoc.getNodeText('Notification/EventType');
		inbox = xmlDoc.getNodeText('Notification/inbox');
		
		createEventRecord();
		
	}
	else if (request.getHeader('Content-Type') == 'application/json') {
		
		//Parse JSON
		
	}
	
	function createEventRecord() {
		var eventGr = new GlideRecord('x_snc_uni_inbox_universal_box_external_events');
		eventGr.initialize();
		eventGr.universal_inbox = getUniversalBox(inbox).getValue('sys_id');
		eventGr.event_type = eventType;
		eventGr.type = 'inbound';
		eventGr.input_payload = payload;
		eventGr.insert();
			
	}
		
	function getUniversalBox(number) {
		var inboxGr = new GlideRecord('universal_inbox');
		inboxGr.addEncodedQuery('active=true^number=' + number);
		inboxGr.query();
		if (inboxGr.next())
			return inboxGr;
		
		return null;
		
	}
	
})(request, response);
