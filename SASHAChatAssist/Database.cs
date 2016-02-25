using System;
using System.Data;
using System.Linq;
using System.Collections.Generic;
using Newtonsoft.Json;
using Microsoft.AspNet.SignalR;

namespace SASHAChatAssist
{
    public class Database
    {

        /* Sets Database tables to an initialized state on application startup
            Empties records from table sashaSessionRecords
            Empties records from table chatSessionRecords
            ChatHelpers
                connectionId ""
                currentChats 0
                lastChatTime CurrentTime
        */
        public static void InitializeTables()
        {
            using (tsc_tools db = new tsc_tools())
            {
                sashaSession sashaSession = new sashaSession();
                var sashaSessionRecords = db.sashaSessions;
                db.sashaSessions.RemoveRange(sashaSessionRecords);
                db.SaveChanges();
                chatSession chatSession = new chatSession();
                var chatSessionRecords = db.chatSessions;
                db.chatSessions.RemoveRange(chatSessionRecords);
                db.SaveChanges();
                foreach (var chatHelperRecord in db.chatHelpers.ToList())
                {
                    chatHelperRecord.connectionId = "";
                    chatHelperRecord.currentChats = 0;
                    chatHelperRecord.lastChatTime = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH\\:mm\\:ssZ");
                }
                db.SaveChanges();
            }
        }

        /* Takes the input of userId and searches in the database table [users] This function will retrieve the userName from the database table [users] */
        public static string GetUserName(string userId)
        {
            using (tsc_tools db = new tsc_tools())
            {
                user user = new user();
                var userRecord = db.users.Where(u => u.userId == userId.ToLower()).SingleOrDefault();
                if (userRecord != null)
                {
                    return userRecord.userName.ToUpper();
                }
                else
                {
                    return null;
                }
            }
        }

        /* Checks helperConnection for an existing record and connectionStatus.
           If no record exists return noRecord
           If a record exists check if connectionStatus is notConnected
                True: Update ConnectionStatus and return newConnection
                False: return existingConnection */
        public static string GetChatHelper(string userId, string connectionId)
        {
            using (tsc_tools db = new tsc_tools())
            {
                chatHelper chatHelper = new chatHelper();
                var chatHelperRecord = db.chatHelpers.Where(c => c.userId == userId).SingleOrDefault();
                if (chatHelperRecord != null)
                {
                    if (chatHelperRecord.connectionId != "")
                    {
                        return "existingConnection";
                    }
                    else
                    {
                        int maximumChats = chatHelperRecord.maximumChats;
                        chatHelperRecord.connectionId = connectionId;
                        db.Entry(chatHelperRecord).CurrentValues.SetValues(chatHelperRecord);
                        db.SaveChanges();
                        return "";
                    }
                }
                else
                {
                    return "noRecord";
                }
            }
        }

        /* Retrieves fields connectionId, userId, userName (from users), sessionStartTime and milestone from
            the sashaSessions Database and returns it to the monitor that called for it */
        public static string GetSashaSessionRecords()
        {
            using (tsc_tools db = new tsc_tools())
            {
                sashaSession sashaSession = new sashaSession();
                var sashaSessionRecord =
                    from s in db.sashaSessions
                    select new { s.connectionId, s.userId, s.user.userName, s.sessionStartTime, s.milestone };
                return JsonConvert.SerializeObject(sashaSessionRecord);
            }
        }

    }
}