(function executionBotAction(params) {

/**
* Author : Milap - 03/22
* This action is used to get the next share trading window for the user
**/

var message = '';
var gd = new GlideDate();

//Get the reference of the current logged in user
var userObj = new GlideRecord('sys_user');
userObj.get(gs.getUserID());



//Check the record in holidays table matching user's location
var tradingWinGr = new GlideRecord('x_snc_stock_preapp_lgl_spa_trading_period');
tradingWinGr.orderByDesc('u_trading_start_date');
tradingWinGr.query();

if (tradingWinGr.next()) {
	
	gd.setValue(tradingWinGr.getValue('u_trading_start_date'));
	var startDate = gd.getByFormat("dd MMM yyyy");
	gd.setValue(tradingWinGr.getValue('u_trading_end_date'));
	var endDate = gd.getByFormat("dd MMM yyyy");
	
	gd = new GlideDate();
	
	//Case 1: Date falls inside the trading window
	if (gd >= tradingWinGr.u_trading_start_date && gd <= tradingWinGr.u_trading_end_date) {
		gd.setValue(tradingWinGr.getValue('u_trading_end_date'));
		message += 'You\'re able to trade shares right now!<br/> The trading window will close on ' + endDate;
		message += '<br/>Please read ServiceNow\'s Insider Trading Policy';
	}
	
	//Case 2: Date is outside the trading window in the future
	else if (tradingWinGr.u_trading_start_date > gd) {
		message += 'You won\'t be able to trade right now.<br/> The next open trading window is between ' + startDate + ' and ' + endDate;
		message += '<br/>Please read ServiceNow\'s Insider Trading Policy';
	}
	
	//Case 3 : Date is not finalized yet
	else {
		message += 'You won\'t be able to trade right now.<br> The next open trading window is still being finalized,so please check back with me in the near future!';
		message += '<br/>Please read ServiceNow\'s Insider Trading Policy';
	}
	
}

gs.info(message);
return { message: message };
	
	
})(params);
