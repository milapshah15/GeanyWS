var IncidentUtility = Class.create();
IncidentUtility.prototype = {
	initialize: function() {
	},
	
	getParentBusinessServices: function(){
		var answer = ' ';
		var businessService = gs.getProperty('com.incident.exclude.business.service');
		var grBusiServ = new GlideRecord('cmdb_ci_service');
		
		if(current.getTableName() == 'incident' || current.getTableName() == 'problem'){
			// For Native application - Incident & Request
			grBusiServ.addEncodedQuery('parent!=NULL^parent NOT IN'+businessService);
			grBusiServ.groupBy('parent');
			grBusiServ.query();
			while(grBusiServ.next()) {
				if (answer.length > 0) {
					//build a comma separated string of Business Services if there is more than one
					answer += (',' + grBusiServ.parent);
				}
				else {
					answer = grBusiServ.parent;
				}
			}
			
		}else{
			// For ESM portal - Incident & Request Submit Form
			var userhasItilRole = false;
			var callerID = current.variables.caller_id || current.variables.on_behalf_of;
			var requestedBy = current.variables.requested_by;
			
			if(callerID){
				userhasItilRole = this.hasItilRole(callerID);
			}else if(requestedBy){
				userhasItilRole = this.hasItilRole(requestedBy);
			}
			
			if(!userhasItilRole){
				grBusiServ.addQuery('u_incident_visibility',true);
				grBusiServ.addQuery('parent.u_incident_visibility',true);
            }
            
			grBusiServ.addEncodedQuery('parent!=NULL^parent NOT IN'+businessService);
			grBusiServ.groupBy('name');
			grBusiServ.query();
			while(grBusiServ.next()) {
				if (answer.length > 0) {
					//build a comma separated string of Business Services if there is more than one
					answer += (',' + grBusiServ.sys_id);
				}
				else {
					answer = grBusiServ.sys_id;
				}
			}
		}
		return 'sys_idIN' + answer;
	},
	
	getChildBusinessService: function(parentBusiServ){
		var parentBusinessService = gs.getProperty('com.incident.exclude.business.service');
		var query = 'parent='+parentBusiServ+'^parent NOT IN'+parentBusinessService;
		return query;
	},
	
	hasItilRole: function(sysId){
		var gRec = new GlideRecord('sys_user_has_role');
		gRec.addQuery('user',sysId);
		gRec.addQuery('role.name','itil');
		gRec.query();
		if(gRec.next()){
			return true;
		}
		return false;
	},
	
	/**
     * Author : Milap Shah
     * Date : 04/19
     * Description  : Function to filter business service based on the user
     */
	
	getParentBusinessServiceByUser: function() {
		var answer = [];
		var businessService = gs.getProperty('com.incident.exclude.business.service');
		var businessServiceGr = new GlideRecord('cmdb_ci_service');	
        if (!this.hasItilRole(gs.getUserID())) {
            businessServiceGr.addQuery('u_incident_visibility',true);
            businessServiceGr.addQuery('parent.u_incident_visibility',true);
        }
        businessServiceGr.addEncodedQuery('parent!=NULL^parent NOT IN' + businessService);
        businessServiceGr.groupBy('name');
        businessServiceGr.query();
        while(businessServiceGr.next()) {
           answer.push(businessServiceGr.getValue('sys_id'));
        }
		return answer.toString();
	},
	

	type: 'IncidentUtility'
};