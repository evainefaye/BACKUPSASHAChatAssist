		$(document).ready(function() {

		    /* Stop your connection if your are closing the window */
		    window.onbeforeunload = function (e) {
		        delete window.hubStart; $.connection.hub.stop();
		    };

		    /* Start the connection if you have not done so */
		    if (typeof(window.hubStart) === "undefined") {
		        $.getScript("http://ajax.aspnetcdn.com/ajax/signalr/jquery.signalr-2.2.0.min.js", function () {
		            $.getScript("/signalr/hubs", function() {
		                chat = $.connection.myHub;
		                $.connection.hub.url = "/signalr";
		                window.startHub();
		            });
		        });
		    }
		});

    /* Starts Hub if not started */
    window.startHub = function () {
        if (typeof(window.hubStart) === "undefined") {
            window.hubStart = $.connection.hub.start().done(function () {
                chat.server.registerSashaSession("TEST","TEST USER","SMPSESSIONID");
            });
        }
    };