using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNet.SignalR;
using Newtonsoft.Json;

namespace SASHAChatAssist
{

    public static class groupNames
    {
        public const string Monitor = "Monitor";
        public const string Sasha = "Sasha";
    }

    public class MyHub : Hub
    {
        /* ***** GENERIC METHODS ***** */

        /* Send a message to the browser console */
        public void Debug(string message)
        {
            Clients.Caller.debug(message);
        }

        /* Update chat with chat messages */
        public void BroadcastMessage(string chatId, string message)
        {
            string name = Clients.Caller.userName;
            string time = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH\\:mm\\:ssZ");
            if (chatId != groupNames.Monitor)
            {
                Database.SaveChatLog(chatId, time, name, message);
            }
            Clients.Group(chatId).broadcastMessage(chatId, time, name, message);
        }

        /* ***** MONITOR SPECIFIC FUNCTIONS ***** */

        /* Returns True if the user is authenticated, false if not */
        public void CheckAuthenticated()
        {
            if (Context.User.Identity.IsAuthenticated)
            {
                RegisterMonitor();
            }
            else
            {
                Clients.Caller.getUserId();
            }
        }

        /* Gather required information for monitor clients and update records if necessary */
        public void RegisterMonitor()
        {

            /* If the user is authenticated it retrieves the userId value from the authenticated information.
                If the user is not authenticated it retrieves the value from the userId sent with the command */
            if (Context.User.Identity.IsAuthenticated) { 
                string id = Context.User.Identity.Name.GetUserId();
                Clients.Caller.userId = id;
            }

            string userId = Clients.Caller.userId;
            /* Retrieve the userName from the database for the userId given */
            string userName = Database.GetUserName(userId);

            /* If userName is not present set it to the userId */
            if (userName == null)
            {
                userName = userId;
            }

            /* Store the userId and userName on the connection for easy retrieval */
            Clients.Caller.userId = userId;
            Clients.Caller.userName = userName;

            /* Update information in the chatHelper table for the user */
            string chatHelper = Database.GetChatHelper(userId, Context.ConnectionId);

            /* No chatHelper record exists, display an error */
            if (chatHelper == "noRecord")
            {
                Clients.Caller.throwError("User Not Found","<p>No user record for ATTUID: '<b>" + userId + "</b>' found.</p><p>Unable to connect as a chatHelper at this time.</p>");
                return;
            }

            /* User shows connected in chatHelper, display an error */
            if (chatHelper == "existingConnection")
            {
                Clients.Caller.throwError("User Already Connected","<p>ATTUID: '<b>" + userId + "</b>' has an existing connection.</p><p>Please try again in a few minutes.</p>");
                return;
            }

            /* Add the connection to the group Monitor */
            Groups.Add(Context.ConnectionId, groupNames.Monitor);

            /* Add the connection to a group based on userId */
            Groups.Add(Context.ConnectionId, userId);

            /* Update the userName div on the main page with the recovered userName */
            Clients.Caller.displayUserName(userName);

            /* Retrieve list of Sasha Sessions from the sashaSessions and push them to the newly connected monitor */
            string sashaSessionRecords = Database.GetSashaSessionRecords();
            Clients.Caller.receiveSashaSessionRecords(sashaSessionRecords);

        }

        /* Update Monitor clients with activity and milestone information */
        public void UpdateMonitor(string milestone, string lastAgentActivityTime)
        {
            string connectionId = Context.ConnectionId;
            Clients.Group(groupNames.Monitor).updateMonitor(connectionId, milestone, lastAgentActivityTime);
        }

        /* Updates the Toggle Helper Status to the correct value */
        public void ToggleHelperStatus(string status)
        {
            Database.ToggleHelperStatus(Context.ConnectionId, status);
        }

        /* ***** SASHA SPECIFIC FUNCTIONS ***** */

        /* Add Initial Record to SASHA Sessions */
        public void RegisterSashaSession(string userId, string agentName, string smpSessionId)
        {
            string userid = userId.ToLower();
            string connectionId = Context.ConnectionId;
            string userName = Database.GetUserName(userId);
            if (userName == null)
            {
                Database.AddUserRecord(userId.ToLower(), agentName.ToUpper());
            }
            Clients.Caller.userId = userId.ToLower();
            Clients.Caller.userName = agentName.ToUpper();
            Clients.Caller.smpSessionId = smpSessionId;
            Groups.Add(connectionId, smpSessionId);
            string sessionStartTime = "";
            // Temporary Line to push a date into the field
            sessionStartTime = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH\\:mm\\:ssZ");
            if (Database.AddSashaSessionRecord(connectionId, userId, smpSessionId, sessionStartTime, ""))
            {
                Groups.Add(connectionId, groupNames.Sasha);
                Groups.Add(connectionId, smpSessionId);
            }
        }

        /* Sets the Session Start Time to a value indicating that you have begun the actual SASHA flow and should be tracked */
        public void UpdateSashaSession()
        {
            string userId = Clients.Caller.userId;
            string connectionId = Context.ConnectionId;
            Database.UpdateSashaSessionRecord(userId, connectionId);
        }


        public void SashaInitiateChat(string smpSessionId)
        {
            /* User Id of agent requesting Chat */
            string userId = Clients.Caller.userId;
            /* UserName of the agent requesting Chat */
            string userName = Clients.Caller.userName;
            /* ConnectionId of session requesting chat */
            string connectionId = Context.ConnectionId;
            Database.GetAvailableHelper(smpSessionId, userId, userName, connectionId);
        }

        /* When a client disconnects attempts to remove its record fro the SashaSessions Database and calls 
            for an update of sasha sessions on all monitor clients */
        public override Task OnDisconnected(bool stopCalled)
        {
            string connectionId = Context.ConnectionId;
            if (Database.RemoveSashaSessionRecord(connectionId))
            {
                Clients.Group(groupNames.Monitor).removeSashaSession(connectionId);
            }
            Database.UpdateChatHelper(connectionId);
            return base.OnDisconnected(stopCalled);
        }

        /* ***** NOT IMPLEMENTED YET ***** */
        // Request SASHA Dictionary Data Retrieval
        public void PullSashaData(string gatherFromConnection, List<string> fields)
        {
            string sendToConnection = Context.ConnectionId;
            string sendToConnectionName = Clients.Caller.userId;
            Clients.Client(gatherFromConnection).gatherSashaData(sendToConnection, fields);
        }

        // Receive SASHA Dictionary Data
        public void PushSashaData(string sendTo, string smpSessionId, string jsonData)
        {
            string receiveFromName = Clients.Caller.userId;
            Clients.Client(sendTo).receiveSashaData(smpSessionId, jsonData);
        }

        // Remotely request saving of the dictionary
        public void SaveDictionary(string connectionId)
        {
            string name = Clients.Caller.userId;
            Clients.Client(connectionId).saveDictionary(name);
        }

        // Remotely initiate a chat window to a SASHA user
        public void RequestChat(string connectionId)
        {
            string requesterId = Context.ConnectionId;
            string name = Clients.Caller.userId;
            Clients.Client(connectionId).requestChat(name, requesterId);
        }
    }
}