﻿	$(document).ready(function() {

	    /* Stop your connection if your are closing the window */
	    window.onbeforeunload = function (e) {
	        delete window.hubStart;
	        $.connection.hub.stop();
	    };

	    /* Start the connection if not started */
	    if (typeof(window.hubStart) === "undefined") {
	        $.getScript("http://ajax.aspnetcdn.com/ajax/signalr/jquery.signalr-2.2.0.min.js", function () {
	            /* URL of the HUB that is being used, this will be changed for production */
	            $.getScript("/signalr/hubs", function() {
	                chat = $.connection.myHub;

	                /* Define methods the server can call on the client */

	                /* This function sends any message desired to the web console */
	                chat.client.debug = function (message) {
	                    console.log(message);
	                };

	                /*  Function to handle broadcasting of chat messages to the SASHA client */
	                chat.client.broadcastMessage = function (chatId, time, name, message) {
	                    time = formatTime(time);
	                    var encodedTime = $("<div />").text(time).html();
	                    var encodedName = $("<div />").text(name).html();
	                    var encodedMsg = $("<div />").text(message).html();
	                    $("div#chatWindow").find("tbody").append("<tr><td class='time'>[" + encodedTime + "]</td><td><strong>" + encodedName + "</strong>:&nbsp;" + encodedMsg + "</td></tr>");
	                    $("div#chatWindow").scrollTop($("div#chatWindow")[0].scrollHeight - $("div#chatWindow")[0].clientHeight);
	                };

	                /* Request to gather SASHA Dictionary Data for broadcast */
	                chat.client.gatherSashaData = function (sendTo,fields) {
	                    gatherSashaData(sendTo,fields);
	                };

	                /* Request to remotely save dictionary */
	                chat.client.saveDictionary = function(requester) {
	                    context="123";
	                    agentID=$("div#agentID span").html();
	                    time=$.now();
	                    captureName=agentID+time;
	                    $.ajax({
	                        type: "POST",
	                        dataType: "json",
	                        url: "CaptureDictionary.do",
	                        data: {
	                            captureName: captureName,
	                            context: context
	                        }
	                    });
	                };

	                /* Function to open chat window within sasha */
	                chat.client.requestChat = function (requester,requesterConnectionId) {
	                    if ($("div#slideChat").is(":visible")) {
	                        return;
	                    }
	                    openChatWindow();
	                    if (!document.hasFocus()) {
	                        alert("Chat opened by " + requester);
	                    }
	                };

	                /* Location of Hub */
	                /* This will be changed for production */
	                $.connection.hub.url = "/signalr";
	                window.startHub();
	            });
	        });
	    }
	});

    /* Function to start Hub if not started */
    window.startHub = function () {
        if (typeof(window.hubStart) === "undefined") {
            window.hubStart = $.connection.hub.start().done(function () {
                rand = Math.floor((Math.random() * 5000000) + 1);
                smpSessionId = "SMPSESSIONID" + rand;
                smpSessionId=smpSessionId.replace(/:/g,"");
                smpSessionId = smpSessionId.replace(/\//g, "");
                $('body').append("<div style=display:none;>SessionId:<span id=sessionId>" + smpSessionId + "</span></div>");
                chat.server.registerSashaSession("USERID","USERNAME",smpSessionId);
                CRToSend();
            });
        }
    };

    /* Formats UTC Time to LocalTime */
    formatTime = function(UTCTime) {
        local = new Date(UTCTime);
        localTime = ("00" + local.getHours()).substr(-2) + ":" + ("00" + local.getMinutes()).substr(-2) + ":" + ("00" + local.getSeconds()).substr(-2);
        return localTime;
    };

    /* Function to setup pressing return to send a message to the chat */
    CRToSend = function() {
        $(".message").off("keyup.CRToSend").on("keyup.CRToSend",function(event) {
            if (event.keyCode == 13) {
                message = $(this).val().trim();
                if (message != "") {
                    chatId = $("span#sessionId").html();
                    chat.server.broadcastMessage(chatId, message);
                    $(this).val("").focus();
                }
            }
        });
    };