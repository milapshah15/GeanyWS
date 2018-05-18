var portalFeedbackUtil = Class.create();
portalFeedbackUtil.prototype = {
	
    initialize: function() {
		
		this.userObj = new GlideRecord('sys_user');
		this.userObj.get(gs.getUserID());
		
		//Define threshold
		//this.searchThreshold = 50; // Number of searches to evaluate
		//this.itemThreshold = 20; // Number of catalog item view user must have done
		//this.searchMetricType = '16d449ffdb1d9b00b454f33eae96195e';
		//this.itemMetricType = 'b1e29ea2db119700b454f33eae961943';
		this.portal = '90a641dddb7a07803d7958a8dc9619e5'; // Employee experience portal sysID
		this.popupCount = 2; // Number of times the popup should be shown to the user
		this.itemToSubmitRatio = 20; // Ratio of view to actual submission
    },
    
    /**
	 * Author : Milap 04/12
	 * description : Assign the Surveys to eligible users
	 */
	
	assignSurveys : function() {
		//this.assignKnowledgeSurvey(); //Keeping this inactive until the final decision is made
		//this.assignItemSurvey(); // Keeping this inactive until the final decision is made
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
	 * Author : Milap 04/12
	 * description : Assign knowledge survey to eligible users (Having more than 50 search count so far)
	 */
	
	assignKnowledgeSurvey : function () {
		var spLogGr = new GlideAggregate('sp_log');
		spLogGr.addEncodedQuery('type=search');
		spLogGr.groupBy('user');
		spLogGr.addAggregate('COUNT');
		spLogGr.query();
		while (spLogGr.next()) {
			
			if (spLogGr.getAggregate('COUNT') > this.searchThreshold && !this.checkForOpenSurvey(this.searchMetricType,spLogGr.getValue('user'))) {
				
			}
		}
	},
	
	/**
	 * Author : Milap 04/12
	 * description : this method check if for a particular user ratio for browsing a catalog item and submitting a catalog item is more than 30%
	 */
	
	assignItemSurvey : function () {
		var spLogGr = new GlideAggregate('sp_log');
		spLogGr.addEncodedQuery('type=Catalog View');
		spLogGr.groupBy('user');
		spLogGr.addAggregate('COUNT');
		spLogGr.query();
		while (spLogGr.next()) {
			if (spLogGr.getAggregate('COUNT') > this.itemThreshold && this._checkForUsersubmission(spLogGr.getValue('user'),spLogGr.getAggregate('COUNT')) && !this.checkForOpenSurvey(this.itemMetricType,spLogGr.getValue('user'))) {
				this.createSurveyInstance(this.itemMetricType,spLogGr.getValue('user'));	
			}
		}
	},
	
	
	/**
	 * Author : Milap 04/12
	 * description : this method checks if user's catalog form view and submission ratio is 30%
	 */
	
	_checkForUsersubmission : function (user,count) {
		var spLogGr = new GlideAggregate('sp_log');
		spLogGr.addEncodedQuery('typeINCat Item Request,Catalog Request^user=' + user);
		spLogGr.addAggregate('COUNT');
		spLogGr.query();
		spLogGr.next();
		var ratio = spLogGr.getAggregate('COUNT') * 100 / count;
		//If the ratio to submission and view is less than 30%
		if (ratio <= this.itemToSubmitRatio)
			return true;
			
		return false;
			
	},
	
	/**
	 * Author : Milap 04/12
	 * description : Check if user has any open survey of a specific metric type
	 */
	

	checkForOpenSurvey : function (metricType,user) {
		var assessGr = new GlideRecord('asmt_assessment_instance');
		assessGr.addEncodedQuery('stateINready,wip,complete^user=' + user + '^metric_type=' + metricType);
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
		if (assessmentGr.next() && this._checkPopCount(assessmentGr.getValue('sys_id')) < this.popupCount) {
			//Increment popup count
			this._incrementPopupCount(assessmentGr.getValue('sys_id'));
			return assessmentGr.getValue('sys_id');
		}
				
		return null;
	},
	
	/**
	 * Author : Milap 04/12
	 * description : increment popup count for this instance
	 */
	
	_incrementPopupCount : function (instanceID) {
		var assessAnsGr = new GlideRecord('asmt_assessment_instance_question');
		assessAnsGr.addEncodedQuery('instance=' + instanceID + '^string_value=survey_count');
		assessAnsGr.query();
		if (assessAnsGr.next()) {
			assessAnsGr.value = parseInt(assessAnsGr.value,10) + 1;
			assessAnsGr.update();
		}
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
		}	
	},

	/**
	 * Author Milap 04/12
	 * Description : Record the date as survey question
	 */
	
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
