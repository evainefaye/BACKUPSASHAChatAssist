$(document).ready(function () {

	chat = $.connection.myHub;

    /* **** START CLIENT HUB FUNCTIONS **** */

	/* Will generate an error message dialog box with the given title and message. Disconnects from the server. */
	chat.client.throwError = function (title, message) {
		$.connection.hub.stop();
		$("<div title='" + title + "'>" + message + "</div>").dialog({
			modal: true,
			buttons: {
				Ok: function () {
					$(this).dialog("close");
				}
			}
		});
	};

	/* Retrieve the userId from a prompt because it could not be retrieved otherwise */
	chat.client.getUserId = function () {
		if (typeof (chat.server.userId) == 'undefined') {
			userId = prompt("No authentication detected. Please Enter your ATTUID:", "");
			userId = $.trim(userId).toLowerCase();
			if (userId == "" || userId == null) {
				chat.client.getUserRecurse();
				return;
			}
			chat.state.userId = userId;
			chat.server.registerMonitor();
		}
	};

    /* Supplied username was blank or a space, ask for it again */
	chat.client.getUserRecurse = function () {
		chat.client.getUserId();
	};

	/* update div#userName with the userName of the user after Database Lookup */
	chat.client.displayUserName = function (userName) {
		$("div#userName").html(userName);
	};

	/* Receives a JSON object of the sashaSessions Database and adds it to the registeredSsashaSessions table */
	chat.client.receiveSashaSessionRecords = function (sashaSessionRecords) {
		$.each($.parseJSON(sashaSessionRecords), function (idx, sashaSession) {
			/* Skip record if sessionStartTime is not set */
			if (sashaSession.sessionStartTime != "") {
				connectionId = sashaSession.connectionId;
				userId = sashaSession.userId;
				userName = sashaSession.userName;
				sessionElapsedTime = sashaSession.sessionStartTime;
				sessionStartTime = sashaSession.sessionStartTime;
				sessionStartTime = new Date(sessionStartTime);
				sessionStartTime = formatTime(sessionStartTime);
				if ($("table#registeredSashaSessions tr#" + connectionId).length == 0) {
					$("table#registeredSashaSessions tbody").append("<tr id='" + connectionId + "'><td class='hidden'><input type=radio name='connectionId' value='" + connectionId + "'></td><td>" + userName + "</td><td>" + userId + "</td><td class='center'>" + localTime + "</td><td class=sessionDuration><span class='session' id=timerAge_" + connectionId + "></span></td><td class='stepName milestone'> Populate on Next Action</td><td class='stepDuration lastAgentActivityTime'><span class='step' id=lastActivityTime_" + connectionId + ">Populate on Next Action</span></td></tr>");
					time = new Date(sessionElapsedTime);
					year = time.getFullYear();
					month = time.getMonth();
					day = time.getDate();
					hour = time.getHours();
					minute = time.getMinutes();
					second = time.getSeconds();
					$("#timerAge_" + connectionId).countdown('destroy');
					$("#timerAge_" + connectionId).countdown({
						since: new Date(year, month, day, hour, minute, second),
						compact: true,
						layout: '{d<} {dn} {dl} {d>} {h<} {hnn} {sep} {h>} {mnn} {sep} {snn}',
						format: 'yowdhMS',
						onTick: checkSessionTime
					});
					$('#registeredSashaSessions tbody tr').on('click', function () {
						$(this).find('td input:radio').prop('checked', true);
						$('.selectedRow').removeClass('selectedRow');
						$(this).addClass('selectedRow');
						$('div#interactionPanel').show();
						$('button#requestData').click();
					});
				}
				sortTable();
			}
		})
	};


	chat.client.broadcastMessage = function (chatId, time, name, message) {
		time = formatTime(time);
		// Html encode display name and message.
		var encodedTime = $("<div />").text(time).html();
		var encodedName = $("<div />").text(name).html();
		var encodedMsg = $("<div />").text(message).html();
		// Add the message to the page. 
		$("div#" + chatId ).find("tbody").append("<tr><td class='time'>[" + encodedTime + "]</td><td><strong>" + encodedName + "</strong>:&nbsp;" + encodedMsg + "</td></tr>");
		$("div.container").scrollTop($("div.container")[0].scrollHeight - $("div.container")[0].clientHeight);
	};

	chat.client.debug = function (message) {
		console.log(message);
	}

	// Needs to be edited now just adds one tab on demand
	chat.client.addChatTabs = function (maximumChatTabs) {
		if (maximumChatTabs > 0) {
			for (i = 1; i <= maximumChatTabs; i++) {
				$("div#chatTabs >ul").append("<li><a href='#chatTab" + i + "' id='chatTab_" + i + "'>Chat " + i + "</a> <span class='ui-icon ui-icon-close' role='presentation'>Remove Tab</span></li>");
				$("div#chatTabs").append("<div id='chatTab" + i + "'>" + i + "</div>");
			}
			$("div#chatTabs").tabs("refresh");
		}
	}

    /* **** END CLIENT HUB FUNCTIONS **** */

	/* Start Connection to Hub and Register the user as a chatHelper */
	$.connection.hub.start().done(function () {
		/* Check to see if user is Authenticated
			Will call registerMonitor of already authenticate, if not it will call getUserId  then registerMonitor */
		chat.server.checkAuthenticated();


		$(".message").keyup(function (event) {
			if (event.keyCode == 13) {
				message = $(this).val().trim();
				if (message != "") {
					chatId = $(this).parent().attr("id");
					chat.server.broadcastMessage(chatId, message);
					/* Clear text box and reset focus for next message */
					$(this).val("").focus();
				}
			}
		});


	});

	/* Create Tabs */
	$("div#chatTabs").tabs();
});


/* Formats UTC Time to Local Time */
formatTime = function (UTCTime) {
	local = new Date(UTCTime)
	localTime = ("00" + local.getHours()).substr(-2) + ":" + ("00" + local.getMinutes()).substr(-2) + ":" + ("00" + local.getSeconds()).substr(-2);
	return localTime;
};

/* Updates the class if the sessionTime is greater than the number of seconds */
checkSessionTime = function (periods) {
	if ($.countdown.periodsToSeconds(periods) >= 600) {
		$(this).closest("span").addClass('attention');
	} else {
		$(this).closest("span").removeClass('attention');
	}
};

/* Updates the class if the stepTime is greater than the number of seconds */
checkStepTime = function (periods) {
	if ($.countdown.periodsToSeconds(periods) >= 300) {
		$(this).closest("span").addClass('attention');
	} else {
		$(this).closest("span").removeClass('attention');
	}
};

/* Sorts the table */
sortTable = function () {
	var rows = $("#registeredSashaClients tbody  tr").get();
	rows.sort(function (a, b) {
		var A = $(a).children("td").eq(1).text().toUpperCase();
		var B = $(b).children("td").eq(1).text().toUpperCase();
		if (A < B) {
			return -1;
		}
		if (A > B) {
			return 1;
		}
		return 0;
	});
	$.each(rows, function (index, row) {
		$("#registeredSashaClients").children("tbody").append(row);
	});
};