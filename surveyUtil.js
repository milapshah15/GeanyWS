var portalFeedbackUtil = Class.create();
portalFeedbackUtil.prototype = {
	
    initialize: function() {
		
		this.userObj = new GlideRecord('sys_user');
		this.userObj.get(gs.getUserID());
		
		//Define Constants
		this.searchMetricType = '16d449ffdb1d9b00b454f33eae96195e';
		this.portal = '90a641dddb7a07803d7958a8dc9619e5'; // Employee experience portal sysID
		this.popupCount = 2; // Number of times the popup should be shown to the user
    },
    
    /**
	 * Author : Milap 04/12
	 * description : Assign the Surveys to eligible users
	 */
	
	assignSurveys : function() {
		this.assignPageSurvey();
	},

	/**
	 * Authod : Milap 04/15
	 * Description : Create Survey if people have gone through all the pages on the top
	 */

	 assignPageSurvey : function () {
		var surveyPages = gs.getProperty('surf.feedback.pages');
		var spLogGr = new GlideAggregate('sp_log');
		spLogGr.addEncodedQuery('type=Page View^portal=' + this.portal + '^' + surveyPages);
		spLogGr.addAggregate('COUNT');
		spLogGr.addAggregate('count(distinct','page');
		spLogGr.groupBy('user');
		spLogGr.query();
		while (spLogGr.next()) {
			if (spLogGr.getAggregate('count(distinct','page') > 7 && !this.checkForOpenSurvey(this.searchMetricType,spLogGr.getValue('user')))
				this.createSurveyInstance(this.searchMetricType,spLogGr.getValue('user'));	
		}
	 },

	 /**
	  * Author : Milap 04/15
	  * Description : Assign surveys to all users who has not attended Surveys
	  */
	 assignAllUserSurveys : function () {
		var userGr = new GlideRecord('sys_user');
		userGr.addEncodedQuery('active=true^sys_class_name=u_employee');
		userGr.query();
		while (userGr.next()) {
			if (!this.checkForOpenSurvey(this.searchMetricType,userGr.getValue('sys_id')))
				{
					var surveyPages = gs.getProperty('surf.feedback.pages');
					var spLogGr = new GlideAggregate('sp_log');
					spLogGr.addEncodedQuery('type=Page View^portal='+this.portal+'^user='+userGr.sys_id+'^'+surveyPages);
					spLogGr.addAggregate('COUNT');
					spLogGr.addAggregate('count(distinct','page');
					spLogGr.groupBy('user');
					spLogGr.query();
					while (spLogGr.next()) {
						if (spLogGr.getAggregate('count(distinct','page') > 0 && spLogGr.getAggregate('count(distinct','page') < 7 &&  !this.checkForOpenSurvey(this.searchMetricType,spLogGr.getValue('user')))
							this.createSurveyInstance(this.searchMetricType,spLogGr.getValue('user'));	
					}
				}
				//this.createSurveyInstance(this.searchMetricType,userGr.getValue('sys_id'));	
		}
	 },
	

	/**
	 * Author : Milap 04/12
	 * description : Check if user has any open survey of a specific metric type
	 */
	

	checkForOpenSurvey : function (metricType,user) {
		var assessGr = new GlideRecord('asmt_assessment_instance');
		assessGr.addEncodedQuery('stateINready,wip,complete^user=' + user + '^metric_type=' + metricType);
		assessGr.query();
		return assessGr.hasNext();
	},

	
	/**
	 * Author : Milap 04/12
	 * description : Create Survey instance
	 */
	
	
	createSurveyInstance : function (metricType,user) {
		return (new SNC.AssessmentCreation()).createAssessments(metricType,'',user);
	},
	
	/**
	 * Author : Milap 04/12
	 * description : This method let the system know whether to show popup to the user
	 */
	
	
	openSurveyModal : function (metricType) {
		var assessmentGr = new GlideRecord('asmt_assessment_instance');
		assessmentGr.addEncodedQuery('stateNOT INcomplete,canceled^metric_type=' + metricType + '^user=' + this.userObj.getValue('sys_id'));
		assessmentGr.query();
		if (assessmentGr.next() && this._checkPopCount(assessmentGr.getValue('sys_id')) < this.popupCount && this._checkForValidDate(assessmentGr.getValue('sys_id'))) {
			//Increment popup count
			this._incrementPopupCount(assessmentGr.getValue('sys_id'));
			return assessmentGr.getValue('sys_id');
		}
				
		return null;
	},

	/**
	 * Author : Milap - 04/15
	 * Description : Check for date before popping up.Date should not be one day prior.Atleast have 1 day of gap between 2 popups
	 */

	 _checkForValidDate : function (instanceID) {
		var assessAnsGr = new GlideRecord('asmt_assessment_instance_question');
		assessAnsGr.addEncodedQuery('instance=' + instanceID + '^string_valueLIKEsurvey_date');
		assessAnsGr.query();
		if (assessAnsGr.next()) {
			var gdt1 = new GlideDateTime(assessAnsGr.getValue('string_value').split('~')[1]);
			var gdt2 = new GlideDateTime();
			var dur = GlideDateTime.subtract(gdt1, gdt2); //the difference between gdt1 and gdt2	
			var dd = dur.getRoundedDayPart();
			if (dd < 1)
				return false;
		}
		return true;
	 },

	/**
	 * Author : Milap 04/12
	 * description : increment popup count for this instance
	 */
	
	_incrementPopupCount : function (instanceID) {
		var assessAnsGr = new GlideRecord('asmt_assessment_instance_question');
		assessAnsGr.addEncodedQuery('instance=' + instanceID + '^string_value=survey_count');
		assessAnsGr.query();
		//Update the count and record the date
		if (assessAnsGr.next()) {
			assessAnsGr.value = parseInt(assessAnsGr.value,10) + 1;
			assessAnsGr.update();
			assessAnsGr = new GlideRecord('asmt_assessment_instance_question');
			assessAnsGr.addEncodedQuery('instance=' + instanceID + '^string_valueLIKEsurvey_date');
			assessAnsGr.query();
			assessAnsGr.next();
			assessAnsGr.string_value = 'survey_date~' + new GlideDateTime().toString();
			assessAnsGr.update();
		}
		//Insert the variable to record count and date for the survey popup
		else {
			assessAnsGr = new GlideRecord('asmt_assessment_instance_question');
			assessAnsGr.addEncodedQuery('instance=' + instanceID + '^metric.datatype=string');
			assessAnsGr.query();
			assessAnsGr.next();
			assessAnsGr.metric = null;
			assessAnsGr.is_hidden = true;
			assessAnsGr.string_value = 'survey_count';
			assessAnsGr.value = 1;
			assessAnsGr.insert();	
			assessAnsGr.string_value = 'survey_date~' + new GlideDateTime().toString();
			assessAnsGr.insert();
		}	
	},
	
	/**
	 * Author : Milap 04/12
	 * description : checkPoppedup count
	 */
	 
	 _checkPopCount : function (instanceID) {
		var assessAnsGr = new GlideRecord('asmt_assessment_instance_question');
		assessAnsGr.addEncodedQuery('instance=' + instanceID + '^string_value=survey_count');
		assessAnsGr.query();
		if (assessAnsGr.next())
			return parseInt(assessAnsGr.value,10);
			
		return 0;
	},
	
    type: 'portalFeedbackUtil'
};
