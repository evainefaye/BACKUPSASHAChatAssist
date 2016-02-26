
		$(document).ready(function() {
			stepInfo = "test";
			stepName = "hard coded step 1";
			try {
				getDictionaryValues(["wf.lastAgentActivityTime"]);
				values = $.parseJSON(json);
				lastAgentActivityTime = values["wf.lastAgentActivityTime"];
				chat.server.updateMonitor(stepName, lastAgentActivityTime);
			}
			catch(err) {
			}
		});