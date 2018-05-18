var universalapproval__Inbox = Class.create();
universalapproval__Inbox.prototype = Object.extendsObject(base,{
	initialize: function(user) {
		this.user = user || (gs.getUserID().indexOf("@snc") == -1 ? gs.getUserID() : gs.getProperty('x_snc_uni_inbox.com.universalapproval.demo_user_id',gs.getUserID()));
		this.active_inboxes = this.collectActiveInboxes();
		this.work_queue = [];
		this.request_queue = [];
		this.acknowledge_queue = [];
		this.history_queue = [];
		this.inbox_keys = Object.keys(this.active_inboxes);
		base.prototype.initialize.call(this,"UnviersalInbox");
	},
	getAttachments:function(table,recordID){
		var attachmentArray = [];
		var attachmentGR = new GlideRecord("sys_attachment");
		attachmentGR.addQuery("table_name",table);
		attachmentGR.addQuery("table_sys_id",recordID);
		attachmentGR.orderBy("file_name");
		attachmentGR.query();
		while(attachmentGR.next()){
			attachmentArray.push({
				name : attachmentGR.file_name.toString(),
				sys_id : attachmentGR.sys_id.toString(),
				bytes : parseInt(attachmentGR.size_bytes.toString())
			});
		}
		return attachmentArray;
	},
	getActiveInboxes:function(){
		return this.active_inboxes;
	},
	getInbox:function(key){
		return this.active_inboxes[key];
	},
	getAllHistoryCounts:function(){
		var inboxes = [];
		for(var i = 0; i != this.inbox_keys.length; i++){
			var key = this.inbox_keys[i]; 
			var inbox = this.active_inboxes[key];
			var count = this.getHistoryCount(key);
			inboxes.push({
				count : count,
				key : key
			});
		}
		return inboxes;
	},
	getTimeEncodedQuery : function(timeIncrement){
		switch(timeIncrement){
			case 3:
				return "sys_created_onONLast 3 months@javascript:gs.beginningOfLast3Months()@javascript:gs.endOfLast3Months()";
			case 6:
				return "sys_created_onONLast 6 months@javascript:gs.beginningOfLast6Months()@javascript:gs.endOfLast6Months()";
			case 9:
				return "sys_created_onONLast 9 months@javascript:gs.beginningOfLast9Months()@javascript:gs.endOfLast9Months()";
			case 12:
				return "sys_created_onONLast 12 months@javascript:gs.beginningOfLast12Months()@javascript:gs.endOfLast12Months()";
			default:
				return false;
		}
	},
	getHistoryCount:function(currentKey){
		var count = 0;
		var inbox = this.active_inboxes[currentKey];
		var table = "universal_inbox_history";
		var historyGA = new GlideAggregate(table);
		historyGA.addAggregate("COUNT");
		historyGA.addQuery("user",this.user);
		historyGA.addQuery("inbox",currentKey);
		historyGA.addEncodedQuery(this.getTimeEncodedQuery(3));
		historyGA.query();
		if(historyGA.next()){
			count = parseInt(historyGA.getAggregate("COUNT").toString());
		}
		return count;
	},
	getAllInboxCounts:function(){
		var inboxes = [];
		for(var i = 0; i != this.inbox_keys.length; i++){
			var key = this.inbox_keys[i];
			var inbox = this.active_inboxes[key];
			var count = this.getInboxCount(key);
			inboxes.push({
				count : count,
				key : key
			});
		}
		return inboxes;
	},
	getInboxCount:function(currentKey){
		var count = 0;
		var inbox = this.active_inboxes[currentKey];
		var query = inbox.query;
		var queryField = inbox.assigned_field;
		var table = inbox.table;
		var inboxGA = new GlideAggregate(table);
		inboxGA.addAggregate("COUNT");
		inboxGA.addEncodedQuery(query);
		inboxGA.addQuery(queryField, this.user);
		inboxGA.query();
		if(inboxGA.next()){
			count = parseInt(inboxGA.getAggregate("COUNT").toString());
		}
		return count;
	},
	getAllInboxQueues:function(queryField){
		var allInboxQueues = [];
		for(var i = 0; this.inbox_keys.length; i++){
			var currentKey = this.inbox_keys[i];
			allInboxQueues.push({
				key : currentKey,
				queue : this.getInboxQueue(currentKey, queryField)
			});
		}
		return allInboxQueues;
	},
	getInboxQueue:function(currentKey, queryField){
		queryField = queryField || "assigned_field";
		var currentInbox = this.active_inboxes[currentKey];
		var inboxQueue = [];
		if(currentInbox){
			var queryGR = this.queryTable(currentInbox.table, currentInbox[queryField], currentInbox.query);
			while(queryGR.next()){
				var dataObject = this._getDataObject(queryGR, currentInbox, currentKey, queryField);
				if(dataObject){
					inboxQueue.push(dataObject);
				}
			}
		}
		return inboxQueue;
	},
	getInboxRecord:function(currentKey,recordID){
		var currentInbox = this.active_inboxes[currentKey];
		var queryGR = this.queryTable(currentInbox.table, false, "sys_id=" + recordID);
		gs.info(queryGR.getEncodedQuery());
		if(queryGR.next()){
			var dataObject = this._getDataObject(queryGR, currentInbox, currentKey, "sys_id");
			if(dataObject){
				return dataObject;
			}
		}
		return false;
	},
	getRecordHistory:function(inboxID, recordID){
		var inboxHistoryGR = new GlideRecord("universal_inbox_history");
		inboxHistoryGR.addQuery("inbox",inboxID);
		inboxHistoryGR.addQuery("document",recordID);
		inboxHistoryGR.query();
		while(inboxHistoryGR.next()){
			var currentRecordID = inboxHistoryGR.document.toString();
			var table = inboxHistoryGR.table.toString();
			var currentKey = inboxHistoryGR.inbox.sys_id.toString();
			var currentInbox = this.active_inboxes[currentKey];
			var actionedState = (JSON.parse(inboxHistoryGR.new_value)).state.toString();
			//var stateField = inboxHistoryGR.inbox.state_field.toString();
			var recordGR = new GlideRecord(table);
			recordGR.get(currentRecordID);
			var dataObject = this._getDataObject(recordGR, currentInbox, currentKey, "assigned_field",true);//this.json.decode(inboxHistoryGR.new_value.toString());
			var aoGDT = new GlideDateTime();
			aoGDT.setDisplayValue(inboxHistoryGR.getDisplayValue("sys_created_on"),gs.getDateTimeFormat());
			if(dataObject){
				dataObject.undo = true;
				dataObject.actioned_on = {
					display_value : aoGDT.getDate().getDisplayValue(),
					value:aoGDT.getNumericValue()
				};
				dataObject.actioned_state = {
					display_value:actionedState,
					value:actionedState
				};
				dataObject.approval_status = {
					display_value:currentInbox[actionedState],
					value:currentInbox[actionedState]
				};
				return dataObject;
			}
		}
		return 	false;
	},
	getHistory:function(inboxID, timeIncrement){
		// Months JSON to map Month name and Month Number
		//var months = {'01' : 'Jan' , '02' : 'Feb' , '03' : 'Mar' , '04' : 'Apr' ,
		//		  '05' : 'May' , '06' : 'Jun' ,'07' : 'Jul' ,'08' : 'Aug' , 
		//		  '09' : 'Sep' , '10' : 'Oct' , '11' : 'Nov' , '12' : 'Dec'} ;
		var encodedQuery = this.getTimeEncodedQuery(timeIncrement);
		var recordArray = [];
		var inboxHistoryGR = new GlideRecord("universal_inbox_history");
		inboxHistoryGR.addQuery("user",this.user);
		inboxHistoryGR.orderByDesc("sys_created_on");
		if(encodedQuery){
			inboxHistoryGR.addEncodedQuery(encodedQuery);
		}
		if(inboxID){
			inboxHistoryGR.addQuery("inbox",inboxID);
		}
		inboxHistoryGR.query();
		while(inboxHistoryGR.next()){
			var currentRecordID = inboxHistoryGR.document.toString();
			if(recordArray.toString().indexOf(currentRecordID) == -1){
				var table = inboxHistoryGR.table.toString();
				var currentKey = inboxHistoryGR.inbox.sys_id.toString();
				var currentInbox = this.active_inboxes[currentKey];
				var actionedState = (JSON.parse(inboxHistoryGR.new_value)).state.toString();
				//var stateField = inboxHistoryGR.inbox.state_field.toString();
				var recordGR = new GlideRecord(table);
				recordGR.get(currentRecordID);
				var dataObject = this._getDataObject(recordGR, currentInbox, currentKey, "assigned_field",true);//this.json.decode(inboxHistoryGR.new_value.toString());
				var aoGDT = new GlideDateTime();
				aoGDT.setDisplayValue(inboxHistoryGR.getDisplayValue("sys_created_on"),gs.getDateTimeFormat());
				if(dataObject){
					var fieldArray = Object.keys(dataObject);
					dataObject.undo = true;
					dataObject.actioned_on = {
						display_value : aoGDT.getDate().getDisplayValue(),
						value:aoGDT.getNumericValue()
					};
					dataObject.actioned_state = {
						display_value:actionedState,
						value:actionedState
					};
					dataObject.approval_status = {
						display_value:currentInbox[actionedState],
						value:currentInbox[actionedState]
					};
					this.history_queue.push(dataObject);
					recordArray.push(currentRecordID);
				}
			}
		}
		return 	this.history_queue;
	},
	generateQueue:function(currentKey, queryField, queue, alternateTable, alternateField, alternateQuery){
		var currentInbox = this.active_inboxes[currentKey];

		var queryGR = this.queryTable(
			alternateTable || currentInbox.table, 
			alternateField || currentInbox[queryField], 
			alternateQuery || currentInbox.query
		);
		while(queryGR.next()){

			var dataObject = this._getDataObject(queryGR, currentInbox, currentKey, queryField);
			if(dataObject){
				queue.push({
					inbox:currentKey,
					card_template:currentInbox.card_template,
					table:alternateTable || currentInbox.table,
					sys_id:queryGR.sys_id.toString(),
					fields:Object.keys(dataObject),
					data_object:dataObject
				});
			}
		}
	},
	_getDataObject:function(queryGR, currentInbox, currentKey, queryField, forHistory){
		var dataObject = {};
		try
		{
			if(currentInbox.advanced || currentInbox.advanced_requested){
				//queryGR.putCurrent();

				var evaluator = new GlideScopedEvaluator();
				var evalGR = new GlideRecord("universal_inbox");
				evalGR.get(currentInbox.sys_id);
				//evalGR.next();
				evaluator.putVariable('answer',null);
				evaluator.putVariable('current',queryGR);
				evaluator.putVariable('forHistory',forHistory);

				if(queryField == "requested_field" && currentInbox.advanced_requested){
					//var tempData = eval(currentInbox.requested_script);


					evaluator.evaluateScript(evalGR,"requested_script");
					var tempData = evaluator.getVariable('answer');


					//var tempData = evaluator.evaluateScript(evalGR,"requested_script");

					dataObject = tempData.data;
				}else{
					//dataObject = eval(currentInbox.script);
					//dataObject = evaluator.evaluateScript(evalGR,"script");		
					evaluator.evaluateScript(evalGR,"script");
					dataObject = evaluator.getVariable('answer');

				}
				//queryGR.popCurrent();
			}else{
				var fieldArray = currentInbox.fields || Object.keys(queryGR);
				for(var x = 0; x != fieldArray.length; x++){
					var currentField = fieldArray[x].toString();
					dataObject[currentField] = {
						display_value:"",
						value:""
					};
					if(currentField.indexOf('.') == -1){
						dataObject[currentField].value = queryGR[currentField].toString();
						if(dataObject[currentField].value){
							dataObject[currentField].display_value = queryGR.getDisplayValue(currentField);
						}
					}else{
						dataObject[currentField] = this.dotWalk(queryGR, currentField);
					}
				}
			}
			var keyArray = Object.keys(dataObject);
			for(var i = 0; i != keyArray.length; i++){
				var key = keyArray[i];
				if(!dataObject[key].display_value && key != "variables" && typeof dataObject[key] != "object" && key != "document_id" && key != "document_table"){
					dataObject[key] = {
						display_value : dataObject[key],
						value : dataObject[key]
					};
				}
			}
			dataObject.table = queryGR.getTableName();
			dataObject.sys_id = queryGR.sys_id.toString();
			if(dataObject.table == "sysapproval_approver"){
				dataObject.document_id = queryGR.document_id.toString();
				dataObject.document_table = queryGR.source_table.toString();
			}
			dataObject.inbox_id = currentKey;
			return dataObject;
		}
		catch(err)
		{
			this.log(err);
		}
	},
	getWorkQueue:function(){
		this.generateWorkQueue();
		return this.work_queue;
	},
	getRequestQueue:function(){
		this.generateRequestQueue();
		return this.request_queue;
	},
	getAcknowledgeQueue:function(){
		this.generateAcknowledgeQueue();
		return this.acknowledge_queue;
	},
	generateWorkQueues:function(){
		for(var i = 0; i != this.inbox_keys.length; i++){
			var currentKey = this.inbox_keys[i];
			var currentInbox = this.active_inboxes[currentKey];
			if(!currentInbox.acknowledge_inbox){
				this.generateQueue(currentKey,"assigned_field",this.work_queue);
			}
		}
		return this.work_queue;
	},
	generateRequestQueue:function(){
		for(var i = 0; i != this.inbox_keys.length; i++){
			var currentKey = this.inbox_keys[i];
			var currentInbox = this.active_inboxes[currentKey];
			var tempObject = {
				table:false,
				field:false,
				query:false
			};
			var current = false;
			if(currentInbox.requested_field){
				if(currentInbox.advanced_requested){
					//tempObject = eval(currentInbox.requested_script);

					var evaluator = new GlideScopedEvaluator();
					var evalGR = new GlideRecord("universal_inbox");
					evalGR.get(currentInbox.sys_id);
					//evalGR.next();
					evaluator.putVariable('answer',null);
					evaluator.putVariable('current',false);
					evaluator.evaluateScript(evalGR,"requested_script");
					tempObject = evaluator.getVariable('answer');

					//tempObject = evaluator.evaluateScript(evalGR,"requested_script");
				}
				this.generateQueue(currentKey,"requested_field",this.request_queue, tempObject.table, tempObject.field, tempObject.query);
			}
		}
		return this.request_queue;
	},
	generateAcknowledgeQueue:function(){

		for(var i = 0; i != this.inbox_keys.length; i++){
			var currentKey = this.inbox_keys[i]; 
			var currentInbox = this.active_inboxes[currentKey];
			if(currentInbox.acknowledge_inbox){
				this.generateQueue(currentKey,"assigned_field",this.acknowledge_queue);
			}
		}
		return this.acknowledge_queue;
	},
	updateJournalField:function(inboxID, recordID, updateMessage){
		var inbox = this.active_inboxes[inboxID];
		var recordGR = new GlideRecord(inbox.table);
		if(recordGR.get(recordID)){
			if(inbox.journal_field){
				recordGR[inbox.journal_field] = updateMessage;
				recordGR.update();
			}else{
				var recipient = recordGR[inbox.requested_field].toString();
				if(recipient == this.user){
					recipient = recordGR[inbox.assigned_field].toString();
				}
				this.createEvent("universalapp__send.message",recordGR,recipient,updateMessage);
			}
		}
	},
	updateRecord:function(inboxID, recordID, updateObject){
		var inbox = this.active_inboxes[inboxID];
		var recordGR = new GlideRecord(inbox.table);
		if(recordGR.get(recordID)){
			var newValue = {};
			var oldValue = {};
			if(inbox.advanced_update_script){
				//recordGR.putCurrent();

				var evaluator = new GlideScopedEvaluator();
				//evaluator.putVariable('answer',null);
				evaluator.putVariable('current',recordGR);
				evaluator.putVariable('newValue',newValue);
				evaluator.putVariable('oldValue',oldValue);	
				evaluator.putVariable('updateObject',updateObject);

				var evalGR = new GlideRecord("universal_inbox");
				evalGR.get(inbox.sys_id);
				//evalGR.next();
				evaluator.evaluateScript(evalGR,"update_script");
				newValue = evaluator.getVariable('newValue');
				oldValue = evaluator.getVariable('oldValue');
				//eval(inbox.update_script);

				//recordGR.popCurrent();
				this.createHistory(inboxID, recordID, oldValue, newValue, true);
			}
			else{
				var keyArray = Object.keys(updateObject);
				for(var i = 0; i != keyArray.length; i++){
					var key = keyArray[i];
					newValue[key] = updateObject[key];
					oldValue[key] = recordGR[key].toString();
					recordGR.setValue(key, updateObject[key]);
				}
				this.createHistory(inboxID, recordID, oldValue, newValue);
				recordGR.update();
			}
		}
    },
	
    _updateState:function(inboxID, recordID, stateValue, comments){
		var inbox = this.active_inboxes[inboxID];
		var recordGR = new GlideRecord(inbox.table);
		if(recordGR.get(recordID)){
			var newValue = {};
            var oldValue = {};
            var updateObject = {};
             //Case 1 : Check if update script is configured
             if (inbox.advanced_update_script) {

                //Build the values to be updated
                updateObject = {
                    comments : comments,
                    state_field : inbox.state_field
                };
                updateObject[inbox.state_field] = inbox[stateValue];

				var evaluator = new GlideScopedEvaluator();
				evaluator.putVariable('current',recordGR);
				evaluator.putVariable('newValue',newValue);
				evaluator.putVariable('oldValue',oldValue);	
				evaluator.putVariable('updateObject',updateObject);
				var evalGR = new GlideRecord("universal_inbox");
				evalGR.get(inbox.sys_id);
				evaluator.evaluateScript(evalGR,"update_script");
				newValue = evaluator.getVariable('newValue');
				oldValue = evaluator.getVariable('oldValue');
                this.createHistory(inboxID, recordID, oldValue, newValue, true);
                return true;
            } 
            else {
                newValue[inbox.state_field] = stateValue;
                oldValue[inbox.state_field] = recordGR[inbox.state_field].toString();
                this.createHistory(inboxID, recordID, oldValue, newValue);
                recordGR.setValue(inbox.state_field,inbox[stateValue]);
                if(comments){
                    recordGR.setValue(inbox.journal_field, comments);
                }
                recordGR.update();
                return recordGR;
            }
		}
		
		return false;
	},
	
	updateDelegateField:function(inboxID, recordID, newDelegate){
		var inbox = this.active_inboxes[inboxID];
		var recordGR = new GlideRecord(inbox.table);
		if(recordGR.get(recordID)){
			var newValue = {};
			var oldValue = {};
			newValue[inbox.assigned_field] = newDelegate;
			oldValue[inbox.assigned_field] = recordGR[inbox.assigned_field].toString();
			this.createHistory(inboxID, recordID, oldValue, newValue);
			recordGR.setValue(inbox.assigned_field, newDelegate);
			recordGR.update();
			return true;
		}
		return false;
	},
	approve:function(inboxID, recordID, comments){
		return this._updateState(inboxID, recordID, "accepted_state", comments);
	},
	reject:function(inboxID, recordID, comments){
		return this._updateState(inboxID, recordID, "rejected_state", comments);
	},
	cancel:function(inboxID, recordID){
		this._updateState(inboxID, recordID, "cancel_state");
	},
	undoAction:function(inboxID, recordID){
		var inbox = this.active_inboxes[inboxID];
		var inboxHistoryGR = new GlideRecord("universal_inbox_history");
		inboxHistoryGR.addQuery("inbox", inboxID);
		inboxHistoryGR.addQuery("document", recordID);
		inboxHistoryGR.addQuery("table",inbox.table);
		inboxHistoryGR.orderByDesc("sys_created_on");
		inboxHistoryGR.query();
		if(inboxHistoryGR.next()){
			var useScriptedUpdate = inboxHistoryGR.scripted_update.toString() == "true";
			var recordGR = new GlideRecord(inbox.table);
			var updateObject = this.json.decode(inboxHistoryGR.old_value.toString());
			if(recordGR.get(recordID)){
				//recordGR.setWorkflow(false);
				var newValue = {};
				var oldValue = {};
				if(useScriptedUpdate){
					recordGR.putCurrent();
					//eval(inbox.update_script);
					var evaluator = new GlideScopedEvaluator();
					var evalGR = new GlideRecord("universal_inbox");
					evalGR.get(inbox.sys_id);
					evalGR.next();
					evaluator.evaluateScript(evalGR,"update_script");

					recordGR.popCurrent();
				}
				else{
					var keyArray = Object.keys(updateObject);
					for(var i = 0; i != keyArray.length; i++){
						var key = keyArray[i];
						recordGR.setValue(key, updateObject[key]);
					}
					recordGR.update();
				}
			}
			inboxHistoryGR.deleteRecord();
		}
	},
	createHistory:function(inboxID, recordID, oldValue, newValue, useScriptedUpdate){
		var inbox = this.active_inboxes[inboxID];
		var inboxHistoryGR = new GlideRecord("universal_inbox_history");
		inboxHistoryGR.initialize();
		inboxHistoryGR.inbox = inboxID;
		inboxHistoryGR.table = inbox.table;
		inboxHistoryGR.document = recordID;
		inboxHistoryGR.user = this.user;
		inboxHistoryGR.old_value = JSON.stringify(oldValue);
		inboxHistoryGR.new_value = JSON.stringify(newValue);
		inboxHistoryGR.scripted_update = useScriptedUpdate || false;
		inboxHistoryGR.insert();
	},
	dotWalk:function(queryGR, currentField){
		var fieldArray = currentField.split('.');
		var firstField = fieldArray.shift();
		var secondField = fieldArray[0];
		var currentGR = queryGR[firstField];
		if(fieldArray.length == 1){
			return {
				value:currentGR[secondField].toString(),
				display_value:currentGR[secondField].getDisplayValue().toString()
			};
		}else{
			return this.dotWalk(currentGR, fieldArray.join('.'));
		}
	},
	collectActiveInboxes:function(){
		var scope = this;
		var inboxObj = {};
		var order = 0;
		var inboxGR = new GlideRecord("universal_inbox");
		inboxGR.orderBy("description");
		inboxGR.addActiveQuery();
		inboxGR.query();
		while(inboxGR.next()){
			inboxObj[inboxGR.sys_id.toString()]={
				order : order,
				sys_id:inboxGR.sys_id.toString(),
				number:inboxGR.number.toString(),
				name:inboxGR.description.toString(),
				assigned_field:inboxGR.assigned_field.toString(),
				requested_field:inboxGR.no_request_field.toString() == "true" ? false : inboxGR.requested_field.toString(),
				journal_field:inboxGR.no_journal_field.toString() == "true" ? false : inboxGR.journal_field.toString(),
				acknowledge_inbox:inboxGR.acknowledge_inbox.toString() == "true",
				query:inboxGR.getValue('query'),
				table:inboxGR.table.toString(),
				fields:inboxGR.fields.nil() ? false : inboxGR.fields.toString().split(','),
				card_template:inboxGR.card_template.nil() ? "default_detail_template" : inboxGR.getDisplayValue("card_template"),
				list_detail_template:inboxGR.x_snc_uni_inbox_list_details_template.nil() ? "default_list_template" : inboxGR.getDisplayValue("x_snc_uni_inbox_list_details_template"),
				modal_message : inboxGR.x_snc_uni_inbox_modal_response_message.nil() ? false : inboxGR.x_snc_uni_inbox_modal_response_message.toString(),
				filters : inboxGR.x_snc_uni_inbox_filterable_fields.nil() ? false :JSON.parse(inboxGR.x_snc_uni_inbox_filterable_fields.toString()),
				advanced:inboxGR.advanced.toString() == "true",
				script:inboxGR.script.toString(),
				advanced_requested:inboxGR.advanced_requested.toString() == "true",
				requested_script:inboxGR.requested_script.toString(),
				state_field:inboxGR.state_field.toString(),
				accepted_state:inboxGR.accepted_state.nil() ? "approved" : inboxGR.accepted_state.toString(),
				rejected_state:inboxGR.rejected_state.nil() ? "rejected" : inboxGR.rejected_state.toString(),
				//pending_state:inboxGR.pending_state.nil() ? "requested" : inboxGR.pending_state.toString(),
				pending_state:"requested",
				advanced_update_script:inboxGR.advanced_update_script.toString() == "true",
				update_script:inboxGR.update_script.toString(),
				show_attachments:inboxGR.x_snc_uni_inbox_show_attachments.toString() == "true"
			};
			order++;
		}
		return inboxObj;
	},
	queryTable:function(tableName, queryField, encodedQuery){
		var recordGR = new GlideRecord(tableName);
		if(queryField){
			recordGR.addQuery(queryField,this.user);
		}
		if(encodedQuery){
			recordGR.addEncodedQuery(encodedQuery);
		}
		recordGR.query();
		return recordGR;
	},
	getDetailView:function(inbox, record, request){
		inbox = inbox || this.getParamAsString(request,"inbox");
		record = record || this.getParamAsString(request,"record");
		var currentInbox = this.active_inboxes[inbox];
		var queryGR = new GlideRecord(currentInbox.table);
		queryGR.get(record);
		return this._getDataObject(queryGR, currentInbox, inbox, "assigned_field", false);
	},
	getParamAsString:function(request,paramName) {
		if (request.queryParams.hasOwnProperty(paramName)){
			return request.queryParams[paramName] + '';
		}
		return false;
	},

	type: 'universalapproval__Inbox'
});