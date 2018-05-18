/**
 * Use this space to create custom cards
 * Assign global priority of the card in order box
 * UserObj - Reference to logged in user's sys_user record
 */

var userObj = new GlideRecord('sys_user');
userObj.get(gs.getUserID());

(function (userObj) {



}(userObj));

(new NotifyNowJoinActiveBridge().showInitiateConferenceLink(current)) && (new NotifyUtils().isVoiceCapable())

var gr = new GlideRecord('notify_participant');
gr.addEncodedQuery('active=true^phone_number=' + phoneNumber + '^ORuser=' + user.sys_id.toString());
gr.query();



/**
 * Author : Milap
 * Description : INC0284914 - Users should not be added if his number is any other conference call
 * Solution : Checking by user's phone number always regardless of if he is participant or not
 */
var contactNumber = '';

if (JSUtil.notNil(user.mobile_number))
	contactNumber = user.mobile_number;
else if (JSUtil.notNil(phoneNumber))
	contactNumber = phoneNumber;

var notifyGr = new GlideRecord('notify_participant');
notifyGr.addEncodedQuery('active=true^phone_number=' + contactNumber);
notifyGr.query();
if (notifyGr.next())
	if (gr.next()) {
		return true;
	} else {
		return false;
	}