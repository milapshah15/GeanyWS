/**
 * Author : Milap Shah 03/09
 * Description : template to handle external integrations
 * Use the payload field which is already a JSON payload received from concur
 * Use this field to build the answer for the template to use
**/

var payload = current.u_request_reason;
var payloadObj = new global.JSON().decode(payload);
answer = payloadObj;

answer['external_case_number'] = current.getValue('external_case_number');
answer['requestor']['display_value'] = current.getDisplayValue('requestor');
answer['requestor']['value'] = current.getValue('requestor');
answer['approver']['display_value'] = current.getDisplayValue('approver');
answer['approver']['value'] = current.getValue('approver');
answer['comments'] = current.getValue('comments');

answer;

