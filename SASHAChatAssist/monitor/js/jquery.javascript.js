$(document).ready(function () {

	chat = $.connection.myHub;
	// Functions called by the Hub

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

	chat.client.getUserRecurse = function () {
		chat.client.getUser();
	}
	//End temporary function

	// Start the connection.
	$.connection.hub.start().done(function () {
		/* Check to see if user is Authenticated
			Will call registerMonitor of already authenticate, if not it will call getUserId */
		chat.server.checkAuthenticated();

	});
});