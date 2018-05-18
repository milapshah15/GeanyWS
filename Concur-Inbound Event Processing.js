//Set global variables
var CONCUR_REST = 'Concur - Expense Report V1.0';
var RESULTRESPONSE = '';

(function(eventGr){
	
	/* Author : Milap 03/07
 	** Use eventGr object to access the event record associated
 	* 
 	* Concur API has several steps and it is quite different than other APis.Here are the steps
 	* Step 1: Surf Gets initial notification saying there is an expense report with the Object URI
 	* Step 2: Take the Object URI from the first call and use it to get the next Action URL (Remember this URL will be used everytime you want to get next action.We have to store it somewhere).
 	* Step 3: Take the WorkflowAction URL from the call response from Step 2 and use post to complete "External validation stage"
 	* Step 4: Use the same Object URI to get the next workflow action URL
 	* Step 5: Call to get the approver name and create external approval record
 	*/
	
	//Start Parsing and store it in the Universal Inbox - Events table
	var xmlDoc = new XMLDocument2();
	xmlDoc.parseXML(eventGr.input_payload);
	result = 'error';
	resultResponse = '';
	
	//Step 1: Handling the initial event coming from concur - Start
	try {
		if ("Report Entered Expense Report Workflow Step - EXTERNAL VALIDATION - SUBMIT" == eventGr.event_type) {
			
			//Step 2 - Get Object URI
			var requestUri = xmlDoc.getNodeText('Notification/ObjectURI');
			var responseBody = _getNextWorkflowAction(requestUri);
		
			if (global.JSUtil.notNil(responseBody)) {
				xmlDoc = new XMLDocument2();
				xmlDoc.parseXML(responseBody);
				
				
				//Step 3 : Take the Workflow action URL and pass the external validation stage of expense report
				var actionUri = xmlDoc.getNodeText('ReportDetails/WorkflowActionURL');
				responseBody = _executeWorkflowAction(actionUri,'Approve','External Validation Successdul');

				if (global.JSUtil.notNil(responseBody)) {
					

					//Step 4: Get the same ObjectURL to get the next workflow Action URL
					responseBody = _getNextWorkflowAction(requestUri);

					
					if (global.JSUtil.notNil(responseBody)) {
					
						xmlDoc = new XMLDocument2();
						xmlDoc.parseXML(responseBody);
			
						//Step 5: Call to get the approver name and create external approval record
						var approvalGr = new GlideRecord('x_snc_uni_inbox_universal_box_external_approvals');
						var userGr = new GlideRecord('sys_user');
						userGr.get('email',xmlDoc.getNodeText('ReportDetails/X_UserID'));
						var imageURL = xmlDoc.getNodeText('ReportDetails/ReceiptImageUrl');

						approvalGr.initialize();
						approvalGr.requestor = userGr.getValue('sys_id');
						approvalGr.universal_inbox = eventGr.universal_inbox;
						approvalGr.external_case_number = xmlDoc.getNodeText('ReportDetails/ReportId');
						approvalGr.state = 'requested';
						approvalGr.u_request_reason = universalBoxExternalUtil.xmlToJSON(xmlDoc.toString());
						approvalGr.response_error = responseBody;
						

						//Get the Expense Approver - Start
						r = new sn_ws.RESTMessageV2(CONCUR_REST, 'getEmployeeApprover');
						r.setRequestHeader('User-Agent','');
						r.setStringParameter("loginID",xmlDoc.getNodeText('ReportDetails/X_UserID'));
						r.setAuthenticationProfile('oauth2','7f17f348dbf01704d255f6c5ae9619c9');
						response = r.execute();
						responseBody = response.getBody();
						RESULTRESPONSE += "\n\nRESPONSE-getEmployeeApprover:" + responseBody;
						httpStatus = response.getStatusCode();
						//Get the Expense Approver - End
						
						xmlDoc = new XMLDocument2();
						xmlDoc.parseXML(responseBody);
						userGr = new GlideRecord('sys_user');
						userGr.get('employee_number',xmlDoc.getNodeText('UserProfile/ExpenseApproverEmployeeID'));
						if (httpStatus == 200) {
							approvalGr.approver = userGr.getValue('sys_id');
							approvalGr.insert();
				
							//attachImage to the approval record
							_attachReceipts(approvalGr,imageURL);
							
							//set event to Processed
							result = 'processed';
							resultRecord = approvalGr.getValue('sys_id');
						}
					}
				}
				
			}
		}
	}catch(err){
		RESULTRESPONSE += "\n\nException:" + err.getMessage());
	}
	//Step 1: Handling the initial event coming from concur - End
	
	resultResponse += RESULTRESPONSE + '\n\n';
	
})(eventGr);

function _buildWorkflowActionBody(action,comments) {
	
	var requestBody = "<WorkflowAction xmlns=\"http://www.concursolutions.com/api/expense/expensereport/2011/03\">";
	requestBody += "<Action>" + action + "</Action>";
	requestBody += "<Comment>" + comments + "</Comment>";
	requestBody += "</WorkflowAction>";
	
	return requestBody;
}


function _executeWorkflowAction(workflowURI,action,comment) {
	
	//Setup the request
	var r = new sn_ws.RESTMessageV2(CONCUR_REST, 'executeWorkflowAction');
	r.setRequestHeader('User-Agent','');
	r.setEndpoint(workflowURI);
	r.setAuthenticationProfile('oauth2','7f17f348dbf01704d255f6c5ae9619c9');
	r.setRequestBody(_buildWorkflowActionBody(action,comment));
	
	//Prepare the response
	var response = r.execute();
	var responseBody = response.getBody();
	var httpStatus = response.getStatusCode();
	RESULTRESPONSE += "\n\nRESPONSE-_executeWorkflowAction:" + responseBody;
	
	if (httpStatus == 200)
		return responseBody;
	else
		return null;

}

function _getNextWorkflowAction(objectURI) {
	
	//Setup the request
	var r = new sn_ws.RESTMessageV2(CONCUR_REST, 'getWorkflowAction');
	r.setRequestHeader('User-Agent','');
	r.setEndpoint(objectURI);
	r.setAuthenticationProfile('oauth2','7f17f348dbf01704d255f6c5ae9619c9');
	
	//Prepare the response
	var response = r.execute();
	var responseBody = response.getBody();
	var httpStatus = response.getStatusCode();
	RESULTRESPONSE += "\n\nRESPONSE-getWorkflowAction:" + responseBody;
	
	if (httpStatus == 200)
		return responseBody;
	else
		return null;

}

function _attachReceipts(approvalGr,imageURL) {
	
	var request  = new sn_ws.RESTMessageV2();        
    request.setHttpMethod('get');
	
	//endpoint - ServiceNow REST Attachment API        
    request.setEndpoint(imageURL);        
    request.saveResponseBodyAsAttachment(approvalGr.getTableName(), approvalGr.getValue('sys_id'), 'Receipts_' + approvalGr.external_case_number); 
	
	response = request.execute();        

}

