(function() { 
	
	data.tabs = [];
	data.apps = [];
	var tabProp = {};
	//Query Okta-Table to get the application details
	var oktaAppGr = new GlideAggregate('u_okta_applications');
	oktaAppGr.addQuery('u_active',true);
	oktaAppGr.groupBy('u_tab');
	oktaAppGr.query();
	
	while (oktaAppGr.next()) {
		var appGr = new GlideRecord('u_okta_applications');
		appGr.addEncodedQuery(oktaAppGr.getQuery());
		appGr.query();
		tabProp.label = oktaAppGr.getDisplayValue('u_tab');
		tabProp.apps = [];
		while (appGr.next()) {
			//Evaluate user criteria
			if (!evaluateUserCriteria(appGr.getValue('sys_id')))
					continue;
			
			logoURL = getAttachementURL('u_logo',appGr.getValue('sys_id'));
			tabProp.apps.push({
				url : appGr.getValue('u_url'),
				label : appGr.getValue('u_label'),
				logo : logoURL,
				order: appGr.getValue('u_order'),
				sys_id : appGr.getValue('sys_id'),
				primary : appGr.getValue('u_primary'),
				widgetProp : $sp.getWidget("esc-surf-fav",{"label":appGr.getValue('u_label'),"sys_id":appGr.getValue('sys_id'),"table":appGr.getTableName()}),
				target : '_blank'});
			
			data.apps.push({
				url : appGr.getValue('u_url'),
				logo : logoURL,
				label : appGr.getValue('u_label'),
				sys_id : appGr.getValue('sys_id'),
				primary : appGr.getValue('u_primary'),
				target : '_blank'});
		}
		data.tabs.push(tabProp);
		tabProp = {};
	}
		
})();

function getAttachementURL(field,sysID) {
	var attachmentGr = new GlideRecord('sys_attachment');
	attachmentGr.addEncodedQuery('file_name=' + field +'^table_sys_id=' + sysID);
	attachmentGr.query();
	if (attachmentGr.next())
		return attachmentGr.getValue('sys_id') + '.iix';
}

/**
	 * Author : Milap Shah - 04/02
	 * Description : Evaluate user criteria for the card slected
	**/
	
function evaluateUserCriteria(appliacationID) {
	var criteriaGr = new GlideRecord('u_m2m_user_criteri_esc_okta_a');
	criteriaGr.addEncodedQuery('u_esc_okta_applications=' + appliacationID);
	criteriaGr.query();
	if (!criteriaGr.hasNext())
		return true;
	
	while (criteriaGr.next()) {
		var criteriaUtil = new UserCriteriaUtil(criteriaGr.getValue('u_user_criteria'));
		if (criteriaUtil.check() == true)
			return true;
	}
	return false;
}