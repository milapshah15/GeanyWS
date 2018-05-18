(function executionBotAction(params) {
	
	gs.info("STOCK BOT ACTION");
	
	
	//Get the reference of the current logged in user
	var userObj = new GlideRecord('sys_user');
	userObj.get(gs.getUserID());
	
	//Initialize variables
	this.opened_by = gs.getProperty('v_bot_arica');
	var message = '';
	var restError = false;
	var latestTick = "";
	
	/**
 	* Create Finance request of
 	* service - "Credit card"
 	* Sub-service - PCard Inquiries
 	**/
	
	
	
	//override authentication profile
	//authentication type ='basic'/ 'oauth2'
	//r.setAuthentication(authentication type, profile name);
	
	//set a MID server name if one wants to run the message on MID
	//r.setMIDServer('MY_MID_SERVER');
	
	//if the message is configured to communicate through ECC queue, either
	//by setting a MID server or calling executeAsync, one needs to set skip_sensor
	//to true. Otherwise, one may get an intermittent error that the response body is null
	//r.setEccParameter('skip_sensor', true);
	
	
		
		//var httpStatus = response.getStatusCode();
		
		
		
		
		
		
		/**
 		* getConversationSummary:
 		* This function helps to get the conversation summary appending last message
 		* from the conversation as the last message is not captured in conversation summary
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
					}
				}
			}
			return latestQuote;
		}
		
		//Prepare the return message

		try{
		
		var symbol = params['symbol'];
		gs.info("symbol"+symbol);
		var r = new sn_ws.RESTMessageV2('Alphavantage-ITSM', 'get');
		r.setStringParameterNoEscape('symbol', symbol);
		//r.setStringParameterNoEscape('symbol', 'fb');
		var response = r.execute();
		gs.info("after execute");
		var responseBody = JSON.parse(response.getBody());
		gs.info(JSON.stringify(responseBody));
		if(responseBody['Error Message']){
			gs.info("error");
			restError = true;
		}else{
			gs.info("no error");
			latestTick = getLatestQuote(responseBody);
			gs.info(JSON.stringify(latestTick));
			if(restError){
				
				message = 'Something went wrong when we tried to retrieve stock for symbol '+ symbol + 'please check if the stock symbol is correct.';
			}else{
				if(latestTick.close >= latestTick.open){
					message = 'Here is the stock price for '+ symbol + '<span class="green-stock">$' + latestTick.close + ' </span>';
				}else{
					message = 'Here is the stock price for '+ symbol + '<span class="red-stock">$' + latestTick.close + ' </span>';
				}
				
			}
		}
		gs.info(message);
		return { message: message};
		}catch(ex) {
			var errorMsg = ex.getMessage();
			gs.info(errorMsg);
		}
		
		
		
		
		
	})(params);
	
