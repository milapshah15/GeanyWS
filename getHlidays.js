(function executionBotAction(params) {
	
	/**
	 * Author : Milap - 02/28
	 * This action is used to get the holiday information for the user
	 * Holidays information is stored in u_holidays table.
	**/

	var message = '';
	var gd = new GlideDate(); 
		
	//Get the reference of the current logged in user
	var userObj = new GlideRecord('sys_user');
	userObj.get(gs.getUserID());

		
	//Check the record in holidays table matching user's location
	var holidayGr = new GlideRecord('u_holidays');
	holidayGr.addEncodedQuery('u_country=' + userObj.getValue('country') + '^u_holiday_date>=javascript:gs.beginningOfToday()');
	holidayGr.orderBy('u_holiday_date');
	holidayGr.query();
	if (holidayGr.next()) {
	  gd.setValue(holidayGr.getValue('u_holiday_date'));
	  message += 'The next company holiday is ' + holidayGr.getValue('u_holiday_name') + ' on ' + gd.getByFormat("dd MMM yyyy");
	}

	
})(params);
