$(document).ready(function () {

	chat = $.connection.myHub;

    /* **** START CLIENT HUB FUNCTIONS **** */

	/* Will generate an error message dialog box with the given title and message. Disconnects from the server. */
	chat.client.throwMessage = function (title, message, stopConnection) {
	    if (stopConnection) {
	        $.connection.hub.stop();
	    }
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
	    $("div#wrapper").show();
		$("div#userName").html(userName);
	};

    /* Sends an announcement to the server for broadcast to all connected clients */
	chat.client.sendAnnouncement = function (announcement) {
	    announcement = announcement.replace(/\r\n|\r|\n/g, "<br />");
	    chat.server.broadcastAnnouncement(announcement);
	};

	/* Adds an entry to the registeredSashaSessions Table for a newly connected Sasha Client */
	chat.client.addSashaSession = function (connectionId, userId, userName, sessionStartTime, milestone) {
		if ($("table#registeredSashaSessions tr#" + connectionId).length == 0 && sessionStartTime != "") {
			time = formatTime(sessionStartTime);
			$("table#registeredSashaSessions tbody").append("<tr id='" + connectionId + "'><td class='hidden'><input type=radio name='connectionId' value='" + connectionId + "'></td><td>" + userName + "</td><td>" + userId + "</td><td class='center'>" + localTime + "</td><td class=sessionDuration><span class='session' id=timerAge_" + connectionId + "></span></td><td class='stepName milestone'>Populated on Agent's Next Action</td><td class='stepDuration lastAgentActivityTime'><span class='step' id=lastActivityTime_" + connectionId + ">Populated on Agent's Next Action</span></td></tr>");
			time = new Date(sessionStartTime);
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
			sortTable();
			$('#registeredSashaSessions tbody tr').on('click', function () {
				$(this).find('td input:radio').prop('checked', true);
				$('.selectedRow').removeClass('selectedRow');
				$(this).addClass('selectedRow');
				$('div#interactionPanel').show();
				$('button#requestData').click();
			});
		}
	};

    // Remove Sasha Client
	chat.client.removeSashaSession = function (connectionId) {
	    $("span#timerAge_" + connectionId).countdown("destroy");
	    $("table#registeredSashaSessions tr#" + connectionId).hide();
	    setTimeout(function () {
	        $("table#registeredSashaSessions tr#" + connectionId).remove();
	    }, 500);
	}

	/* Receives a JSON object of the sashaSessions Database and adds it to the registeredSashaSessions table */
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
	    });
	};

    /* Broadcast Message between users */
	chat.client.broadcastMessage = function (chatId, time, name, message) {
		time = formatTime(time);
		// Html encode display name and message.
		var encodedTime = $("<div />").text(time).html();
		var encodedName = $("<div />").text(name).html();
		var encodedMsg = $("<div />").text(message).html();
	    // Add the message to the page.
		$("div#" + chatId ).find("tbody").append("<tr><td class='time'>[" + encodedTime + "]</td><td><strong>" + encodedName + "</strong>:&nbsp;" + encodedMsg + "</td></tr>");
		$("div.container").scrollTop($("div.container")[0].scrollHeight - $("div.container")[0].clientHeight);
		if ($("#chatTabs ul li.ui-state-active").attr("chatId") != chatId) {
		    $("#chatTabs .ui-tabs-nav a[href='#" + chatId + "']").addClass("pendingMessage");
		}
	};

    /* Sends a message to the web console, used for debugging */
	chat.client.debug = function (message) {
		console.log(message);
	};

	/* Add a Chat Tab when needed */
	chat.client.addChatTab = function (smpSessionId, userName) {
	    smpSessionId = smpSessionId.replace(/:/g, "");
	    smpSessionId = smpSessionId.replace(/\//g, "");
	    $("div#chatTabs > ul").append("<li chatId='" + smpSessionId + "'><a href='#" + smpSessionId + "'>" + userName + "</a> <span class='ui-icon ui-icon-close' role='presentation'>Remove Tab</span></li>");
		$("div#chatTabs").append("<div id='" + smpSessionId + "'><div class='container'><table class='chat'><tbody></tbody></table></div><input class='message' placeholder='ENTER YOUR MESSAGE HERE' type='text' /></div>");
		$("div#chatTabs").tabs("refresh");
        /* Highlight tab if it is not active and content has been added to it */
		$("#chatTabs .ui-tabs-nav li").off("click.higlight").on("click.highlight", function () {
		    $(this).find("a").removeClass("pendingMessage");
		});
		CRtoSend();
	};

    /* Receive requested SASHA Dictonary Data */
	chat.client.receiveSashaData = function (smpSessionId, jsonData) {
	    parseSashaData(smpSessionId, jsonData);
	};

    /* Updates Monitor for given connection with updated milestone / last Agent Activity Time */
	chat.client.updateMonitor = function (connectionId, milestone, lastAgentActivityTime) {
	    $("tr#" + connectionId + " > td.milestone").html(milestone);
	    time = new Date(lastAgentActivityTime);
	    lastAgentActivityTime = lastAgentActivityTime.replace(" ", "T");
	    lastAgentActivityTime = lastAgentActivityTime + "-0600";
	    /* Because I cannot determine the timezone of the server to get correct time conversion for the client, I am instead using hte local time at the client */
	    time = new Date();
	    year = time.getFullYear();
	    month = time.getMonth();
	    day = time.getDate();
	    hour = time.getHours();
	    minute = time.getMinutes();
	    second = time.getSeconds();
	    $("#lastActivityTime_" + connectionId).countdown('destroy');
	    $("#lastActivityTime_" + connectionId).countdown({
	        since: new Date(year, month, day, hour, minute, second),
	        compact: true,
	        layout: '{d<} {dn} {dl} {d>} {h<} {hnn} {sep} {h>} {mnn} {sep} {snn}',
	        format: 'yowdhMS',
	        onTick: checkStepTime
	    });
	}


    /* **** END CLIENT HUB FUNCTIONS **** */

	/* Start Connection to Hub and Register the user as a chatHelper */
	$.connection.hub.start().done(function () {
		/* Check to see if user is Authenticated
			Will call registerMonitor of already authenticate, if not it will call getUserId  then registerMonitor */
	    chat.server.checkAuthenticated();
	    CRtoSend();
	    /* Handle Toggling online status */
	    $("input#onlineStatus").off("click.onlineStatus").on("click.onlineStatus", function () {
	        if ($(this).val() == "Make Available For Chat") {
	            $(this).prop("value", "Make Offline For Chat");
	            chat.server.toggleHelperStatus("Online")
	        } else {
	            $(this).prop("value", "Make Available For Chat");
	            chat.server.toggleHelperStatus("Offline")
	        }
	    });
	    /* Setup Sending Announcements to connected users */
	    $("input#sendAnnouncement").off("click.sendAnnouncement").on("click.sendAnnouncement", function () {
	        message = $("textarea#announcement").val().trim();
	        if (message.length > 0) {
	            chat.server.broadcastAnnouncement(message);
	        }
	    });

	    /* Setup request data button */
	    $("button#requestData").off("click.requestData").on("click.requestData", function () {
	        if (typeof ($("input[type=radio][name=connectionId]:checked").val()) == "undefined") {
	            $("span#errorText").html("Must have a connection selected to request dictionary data from!");
	            return;
	        } else {
	            gatherFromConnection = $("input[type=radio][name=connectionId]:checked").val();
	        }
	        fieldData = $("textarea#fields").val().trim();
	        setupPage();
	        if (fieldData.length > 0) {
	            $("span#errorText").html("");
	            fields = fieldData.split(",");
	            chat.server.pullSashaData(gatherFromConnection, fields);
	        } else {
	            $("span#errorText").html("Enter at least one field value to retrieve!");
	        }
	    });

	    /* Setup Request Chat Button */
	    $("button#requestChat").off("click.requestChat").on("click.requestChat", function () {
	        if (typeof ($("input[type=radio][name=connectionId]:checked").val()) == "undefined") {
	            $("span#errorText").html("Must have a connection selected to request a chat with!");
	            return;
	        }
	        requestChat($("input[type=radio][name=connectionId]:checked").val());
	    });

	    /* Setup Save Dictionary Button */
	    $("button#saveDictionary").off("click.saveDictionary").on("click.requestChat", function () {
	        if (typeof ($("input[type=radio][name=connectionId]:checked").val()) == "undefined") {
	            $("span#errorText").html("Must have a connection selected to request a remote dictionary save!");
	            return;
	        }
	        chat.server.saveDictionary($("input[type=radio][name=connectionId]:checked").val());
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

CRtoSend = function () {
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
};

$.fn.addNewRow = function (key, value) {
    $(this).find("tbody").append("<tr><td>" + key + "</td><td>" + value + "</td></tr>");
};

requestSashaData = function (requestFrom) {
    fieldData = $("input#fields").val().trim();
    setupPage();
    if (fieldData.length > 0) {
        $("span#errorText").html("");
        fields = fieldData.split(",");
        chat.server.pullSashaData(requestFrom, fields);
    } else {
        $("span#errorText").html("Enter at least one value to retrieve!");
    }
};

parseSashaData = function (smpSessionId, json) {
    setupPage();
    $('div#interactionPanel').show();
    parsedData = $.parseJSON(json);
    $.each(parsedData, function (key, value) {
        value = value.replace(new RegExp('\\\\n', 'g'), '<br />');
        $("table#resultsTable").addNewRow(key, value);
    });
};

setupPage = function () {
    $("#resultsTable > tbody").html("");
    $("span#errorText").html("");
    d = new Date();
    time = d.toLocaleString();
    $("span#lastUpdate").html(time);
};

requestChat = function (connectionId) {
    chat.server.requestChat(connectionId);
};