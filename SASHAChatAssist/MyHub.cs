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


        /* Monitor Specific Functions */

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

            // Add the connection to the group Monitor
            Groups.Add(Context.ConnectionId, groupNames.Monitor);

            // Add the connection to a group based on userId
            Groups.Add(Context.ConnectionId, userId);
        }




    }
}