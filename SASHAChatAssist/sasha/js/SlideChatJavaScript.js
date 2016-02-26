
		$(document).ready(function() {
		    if ($("#openChat").length == 0) {
		        $("div#headerButtons > div.buttons").append("<button id=openChat class=\"openChat ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only blueButton\" role=button aria-disabled=false><span class=ui-button-text>Open Chat</span></button>");
		    }
			
		    $("body").off("click.openChat").on("click.openChat",".openChat",function () {
		        openChatWindow();
		    });

		    $("body").off("click.closeChat").on("click.closeChat",".closeChat",function () {
		        closeChatWindow();
		    });
			
		    $("body").prepend("<div id=slideChat><div class=closeChat>X</div><div id=chatWindow><table class=chat><tbody></tbody></table></div><input type=text placeholder=\"ENTER YOUR MESSAGE HERE\" class=message /></div>");
		});
 
    function openChatWindow () {
        $("div#slideChat").show();
        smpSessionId = $("span#sessionId").html();
        chat.server.sashaInitiateChat(smpSessionId);
        $("div#slideChat").animate({top: "0"}, 500);
    }

    function closeChatWindow() {
        $("div#slideChat").animate({top: "-500px"}, 500, function() {
            $("#slideChat").hide();
        });
    }