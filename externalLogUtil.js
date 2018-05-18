var universalBoxExternalLogUtil = Class.create();
universalBoxExternalLogUtil.prototype = {
	type: 'universalBoxExternalLogUtil',
	_logSource: "ApprovalCentral-External",
	
	/**
	 * Author : Milap 03/12/2018
	 * Description : This utility helps to debug any integration issues we may face for bringing external approvals to Surf
	 * The level for each integration can be configured in the Univeral Inbox record for that integration
	 **/
	 
	initialize: function(universalBoxGr,eventGr,source) {
		this.universalBoxGr = universalBoxGr;
		this.eventGr = eventGr;
		if(JSUtil.notNil(source)) {
			source = this._logSource + "." + source;
		}
		else {
			source = this._logSource;
		}
		
		this.gl = new global.GSLog(universalBoxGr.getValue('log_level'),source);
	},
	
	
	debug: function(msg) {
		this._log("debug",msg);
	},

	info: function(msg) {
		this._log("info",msg);
	},

	notice: function(msg) {
		this._log("notice",msg);
	},

	warn: function(msg) {
		this._log("warning",msg);
	},
	
	error: function(msg) {
		this._log("err",msg);
	},

	_log: function(level,msg) {
	
		var logMsg = universalBoxExternalLogUtil.buildLogMessage(this.universalBoxGr,this.eventGr,msg);
		
		if(JSUtil.notNil(this.gl)) {
			//emerg,alert,crit,err,warning,notice,info,debug
			if(level == "debug") {
				this.gl.logDebug(logMsg);
			}
			else if(level == "info") {
				this.gl.logInfo(logMsg);
			}
			else if(level == "warning") {
				this.gl.logWarning(logMsg);
			}
			else if(level == "err") {
				this.gl.logErr(logMsg);
			}
			else if(level == "crit") {
				this.gl.logCrit(logMsg);
			}
			else if(level == "alert") {
				this.gl.logAlert(logMsg);
			}
			else if(level == "emerg") {
				this.gl.logEmerg(logMsg);
			}
			else {
				this.gl.logNotice(logMsg);
			}
		}
	}
};

universalBoxExternalLogUtil.buildLogMessage = function(universalBoxGr,eventGr,text) {
	var time = universalBoxExternalLogUtil.getTimestamp();	
	var logMsg = "[" + time + "]";
	
	if(JSUtil.notNil(eventGr) && JSUtil.notNil(eventGr.approval_record.external_case_number)) {
		logMsg += " " + eventGr.approval_record.external_case_number + ":";
	}
	
	if(JSUtil.notNil(eventGr) && JSUtil.notNil(eventGr.number)) {
		logMsg += " " + eventGr.number + ":";
	}
	
	if(JSUtil.notNil(universalBoxGr) && JSUtil.notNil(universalBoxGr.number)) {
		logMsg += " " + universalBoxGr.number + ":";
	}
	
	logMsg += " " + text;	
	return logMsg;
};


universalBoxExternalLogUtil.getTimestamp = function() {
	var date = new Date();
	var month = date.getMonth() + 1;
	var day = date.getDate();
	var hour = date.getHours();
	var minute = date.getMinutes();
	var second = date.getSeconds();
	var millis = date.getMilliseconds();
	
	month = (month < 10) ? "0"+month : ""+month;
	day = (day < 10) ? "0"+day : ""+day;
	hour = (hour < 10) ? "0"+hour : ""+hour;
	minute = (minute < 10) ? "0"+minute : ""+minute;
	second = (second < 10) ? "0"+second : ""+second;
	if(millis < 10) {
		millis = "00"+millis;
	}
	else if( millis < 100) {
		millis = "0"+millis;
	}

	var time = date.getFullYear()+"-"+month+"-"+day+" "+hour+":"+minute+":"+second+"."+millis;

	return time;
};
