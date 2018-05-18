function escChatBotCtrl($scope, $rootScope, $timeout, snRecordWatcher, spUtil, $sce, $sanitize, $filter, escAnalytics, $http) {
    var c = this;
    var message_timer;

    c.$onInit = function() {
        $scope.chat_open = false;
        $scope.yesNoActive = false;
        c.text = "";
        c.evaResponse = "";
        $scope.message = {};
        $rootScope.freeze = false;
        $rootScope.textEntered = false;
        c.showWidget = true;
        c.evaWaitingResponses = ["Alright,Let's see what we got", "Did you know you can search for stock price using stock symbols ex:'stock price of now'", "Did you know: You can get next company holiday easily by asking me"];
        $scope.closeChat();


    };

	
	
	
	
	
	/* Watson Speech to Text */
	$scope.Submit = function () {
		alert("Work In Progress");
		
		fileUpload();
	};

	$scope.closeChat = function() {
		endMessageTimer();
		$scope.data.messages = [];
		c.data.clearMessages = false;
		c.server.get({ clear: true }).then(function(r) {

			// $scope.data.bottyping = 'hide';
		});
	};

	function endMessageTimer() {
		if (message_timer) {
			$timeout.cancel(message_timer);
		}
	}

	c.keyPressed = function() {

		if (c.text.length > 0) {
			$rootScope.textEntered = true;
			if (event.keyCode == 13) {
				$scope.message.text = c.text;
				//BI analytics Tagging start
				escAnalytics.trackLink('ESC Pi- Chat Bot : ' + c.text);
				//BI analytics Tagging end
				$scope.sendMessage($scope.message);
			}

		} else {
			$rootScope.textEntered = false;
		}

	};


	c.submitArrow = function(){
		if (c.text.length > 0) {
			$rootScope.textEntered = true;
			$scope.message.text = c.text;
			//BI analytics Tagging start
			escAnalytics.trackLink('ESC Pi- Chat Bot : ' + c.text);
			//BI analytics Tagging end
			$scope.sendMessage($scope.message);
		} else {
			$rootScope.textEntered = false;
		}
	};

	function loadMessages(type) {
		$scope.message_loading = true;
		$scope.yesNoActive = false;

		return c.server.get({ load_messages: true }).then(function(r) {
			if (r.data.helloMsg) {
				loadMessages();
			}
			$scope.data.messages = r.data.messages;

			if ($scope.data.messages) {

				if ($scope.data.messages.length > 1 && ($scope.data.messages[$scope.data.messages.length - 1].sender) == 'me') {
					$scope.data.bottyping = 'show';
					$rootScope.freeze = true;
				} else {
					$scope.data.bottyping = 'hide';
					$rootScope.freeze = false;
				}
				for (var i = 0; i < $scope.data.messages.length; i++) {
					var html = $sce.trustAsHtml($scope.data.messages[i].text);
					$scope.data.messages[i].text = html;
				}
			}
			$scope.message_loading = false;
			console.log($scope.data.messages);
			if ($scope.data.messages.length > 0 && $scope.data.messages[$scope.data.messages.length - 1].sender == 'Arica ') {
				c.evaResponse = $scope.data.messages[$scope.data.messages.length - 1].text;
				c.text = "";
			}

			if ($scope.data.messages.length > 0 && $scope.data.messages[$scope.data.messages.length - 1].sender == 'Arica ' && $scope.data.messages[$scope.data.messages.length - 1].type == 'widget') {

				if ($scope.widgetToEmbed) {
					if (!jsonequals($scope.widgetToEmbed.options, $scope.data.messages[$scope.data.messages.length - 1].widget.options)) {
						c.showWidget = false;
						$scope.widgetToEmbed = $scope.data.messages[$scope.data.messages.length - 1].widget;


						$timeout(function() {
							c.showWidget = true;
						}, 0);
					}
				} else {
					c.showWidget = false;
					$scope.widgetToEmbed = $scope.data.messages[$scope.data.messages.length - 1].widget;

					$timeout(function() {
						c.showWidget = true;
					}, 0);
				}

			}
			$rootScope.textEntered = false;
		});


	};

	function sendMessage(message, end_conversation) {
		c.server.get({ message: message, end_conversation: end_conversation }).then(function() {
			$scope.message_loading = false;
			$timeout(function() {
				//c.text = "";
			}, 0);
		});
	}

	function jsonequals(x, y) {
		// If both x and y are null or undefined and exactly the same
		if (x === y) {
			return true;
		}

		// If they are not strictly equal, they both need to be Objects
		if (!(x instanceof Object) || !(y instanceof Object)) {
			return false;
		}

		// They must have the exact same prototype chain, the closest we can do is
		// test the constructor.
		if (x.constructor !== y.constructor) {
			return false;
		}

		for (var p in x) {
			// Inherited properties were tested using x.constructor === y.constructor
			if (x.hasOwnProperty(p)) {
				// Allows comparing x[ p ] and y[ p ] when set to undefined
				if (!y.hasOwnProperty(p)) {
					return false;
				}

				// If they have the same strict value or identity then they are equal
				if (x[p] === y[p]) {
					continue;
				}

				// Numbers, Strings, Functions, Booleans must be strictly equal
				if (typeof(x[p]) !== "object") {
					return false;
				}

				// Objects and Arrays must be tested recursively
				// if (!equals(x[p], y[p])) {
				//     return false;
				// }
			}
		}

		for (p in y) {
			// allows x[ p ] to be set to undefined
			if (y.hasOwnProperty(p) && !x.hasOwnProperty(p)) {
				return false;
			}
		}
		return true;
	};





	$scope.sendMessage = function(message) {

		$scope.data.bottyping = 'show';
		$rootScope.freeze = true;
		//c.evaResponse = c.evaWaitingResponses[Math.floor(Math.random()*c.evaWaitingResponses.length)];;
		$scope.message_loading = true;
		sendMessage(angular.copy($scope.message));
		$scope.message = {};
		//startMessageTimer();
	};

	$scope.$on("record.updated", function(evt) {
		loadMessages();
	});



	loadMessages().then(function() {
		// console.log("loaded");
	});


	$rootScope.$on('clearChat', function(event, data) {
		$scope.closeChat();

	});
	// listen for the event in the relevant $scope
	$rootScope.$on('sendMessageToWatson', function(event, data) {

		//console.log(data); // 'Data to send'
		$scope.message.text = data;
		$scope.sendMessage($scope.message);
		$scope.yesNoActive = false;
	});

	$scope.$on('yesNoInvoked', function(event, data) {
		// $('.sp-row-content').removeClass('add-overflow-hidden');
		$scope.yesNoActive = true;
		$scope.widgetToEmbed = "";

		var message = {
			created: new Date(),
			//index:$scope.data.messages.length,
			sender: 'Arica ',
			template: "pi-chat-message-bot-eva.html",
			text: $sce.trustAsHtml('Was this helpful?'),
			type: 'widget',
			widget: c.data.yesNoWidget
		};
		$timeout(function() {
			$scope.data.messages.push(message);
			c.evaResponse = 'Was this helpful?';
		}, 10)

		//console.log(data); // 'Data to send'
	});



	// snRecordWatcher.initList('u_ibm_watson_chat_message', 'u_recipient=' + $scope.user.sys_id);

	snRecordWatcher.initList('u_ibm_watson_chat_message', 'u_sender=' + $scope.user.sys_id + '^ORu_recipient=' + $scope.user.sys_id);
}