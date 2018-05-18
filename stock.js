(function executionBotAction(params) {
	
	return { message: 'Test'};	
	gs.info('Milap :Test');
	//Get the reference of the current logged in user
	var userObj = new GlideRecord('sys_user');
	userObj.get(gs.getUserID());
	
	//Initialize variables
	this.opened_by = gs.getProperty('v_bot_arica');
	var message = '';
	var restError = false;
	var latestTick = "";	
		
	/**
	* getLatestQuote:
	* This function helps to get the latest stock price
	**/
	
	function getLatestQuote(responseBody) {
		var latestQuote = "";
		if (responseBody.hasOwnProperty('Time Series (1min)')) {
			var latestDate = Object.keys(responseBody['Time Series (1min)']).sort().reverse()[0];
			if (responseBody['Time Series (1min)'][latestDate].hasOwnProperty('1. open') &&
				responseBody['Time Series (1min)'][latestDate].hasOwnProperty('2. high') &&
				responseBody['Time Series (1min)'][latestDate].hasOwnProperty('3. low') &&
				responseBody['Time Series (1min)'][latestDate].hasOwnProperty('4. close') &&
				responseBody['Time Series (1min)'][latestDate].hasOwnProperty('5. volume')
			) {
				latestQuote = {
					'symbol': symbol,
					'open': responseBody['Time Series (1min)'][latestDate]['1. open'],
					'high': responseBody['Time Series (1min)'][latestDate]['2. high'],
					'low': responseBody['Time Series (1min)'][latestDate]['3. low'],
					'close': responseBody['Time Series (1min)'][latestDate]['4. close'],
					'volume': responseBody['Time Series (1min)'][latestDate]['5. volume']
				};
			}
		}
		return latestQuote;
	}
	
	//Prepare the return message

	try{
		var symbol = params['symbol'];
		var r = new sn_ws.RESTMessageV2('Alphavantage-ITSM', 'get');
		r.setStringParameterNoEscape('symbol', symbol);
		var response = r.execute();
		var responseBody = JSON.parse(response.getBody());
		if (200 == response.getStatusCode()) {
			latestTick = getLatestQuote(responseBody);
			gs.info(JSON.stringify(latestTick));
			
			if(latestTick.close >= latestTick.open){
				message = 'Here is the stock price for '+ symbol + '<span class="green-stock">$' + latestTick.close + ' </span>';
			}
			else{
				message = 'Here is the stock price for '+ symbol + '<span class="red-stock">$' + latestTick.close + ' </span>';
			}
		}
		else {
			gs.info("error");
			message = 'Something went wrong when we tried to retrieve stock for symbol '+ symbol + 'please check if the stock symbol is correct.';
		}
		gs.info('Milap Test' + message);
		
		
	}catch(ex) {
		var errorMsg = ex.getMessage();
		gs.info("Milap Test" + errorMsg);
	}
	return { message: 'Test'};	
		
})(params);
	
