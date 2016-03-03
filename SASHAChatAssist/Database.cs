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
            chatSessionRecords
                set completeDate to 'Auto Closed' for any records that were not closed
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
                foreach (var chatSessionRecord in db.chatSessions.Where(c => c.completeDate == "").ToList())
                {
                    chatSessionRecord.completeDate = "Auto Closed";
                }
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

        /* Saves the Chat Log to the Database */
        public static void SaveChatLog(string chatId, string time, string name, string message)
        {
            using (tsc_tools db = new tsc_tools())
            {
                chatLog chatLog = new chatLog();
                chatLog.id = Guid.NewGuid();
                chatLog.chatId = chatId;
                chatLog.time = time;
                chatLog.name = name;
                chatLog.message = message;
                db.chatLogs.Add(chatLog);
                db.SaveChanges();
            }
        }

        /* Adds a record to the SashaSessions Database on connection of a SASHA client */
        public static bool AddSashaSessionRecord(string connectionId, string userId, string smpSessionId, string sessionStartTime, string milestone)
        {
            using (tsc_tools db = new tsc_tools())
            {
                sashaSession sashaSession = new sashaSession();
                if (!db.sashaSessions.Any(s => s.connectionId == connectionId))
                {
                    sashaSession.connectionId = connectionId;
                    sashaSession.userId = userId;
                    sashaSession.smpSessionId = smpSessionId;
                    sashaSession.sessionStartTime = sessionStartTime;
                    sashaSession.milestone = milestone;
                    db.sashaSessions.Add(sashaSession);
                    db.SaveChanges();
                    return true;
                }
                return false;
            }
        }

        /* Updates the sashaSessionrecord with the current time so that it starts getting tracked on monitors */
        public static void UpdateSashaSessionRecord(string userId, string connectionId)
        {
            using (tsc_tools db = new tsc_tools())
            {
                chatHelper chatHelper = new chatHelper();
                var sashaSessionRecord =
                    (from s in db.sashaSessions
                     where s.userId == userId
                     && s.connectionId == connectionId
                     select s
                    ).FirstOrDefault();
                if (sashaSessionRecord != null)
                {
                    string userName = sashaSessionRecord.user.userName;
                    string sessionStartTime = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH\\:mm\\:ssZ");
                    sashaSessionRecord.sessionStartTime = sessionStartTime;
                    db.Entry(sashaSessionRecord).CurrentValues.SetValues(sashaSessionRecord);
                    db.SaveChanges();
                    var context = GlobalHost.ConnectionManager.GetHubContext<MyHub>();
                    context.Clients.Group(groupNames.Monitor).addSashaSession(connectionId, userId, userName, sessionStartTime);
                }
            }
        }

        /* Removes the SASHA session record from the database */
        public static bool RemoveSashaSessionRecord(string connectionId)
        {
            using (tsc_tools db = new tsc_tools())
            {
                sashaSession sashaSession = new sashaSession();
                var sashaSessionRecord = db.sashaSessions.Where(s => s.connectionId == connectionId).SingleOrDefault();
                if (sashaSessionRecord != null)
                {
                    db.sashaSessions.Remove(sashaSessionRecord);
                    db.SaveChanges();
                    return true;
                }
                return false;
            }
        }

        /* Updates Chat Helper record to mark them offline, no longer connected and closes any changes they have open in chatSessions */
        public static void UpdateChatHelper(string connectionId)
        {
            using (tsc_tools db = new tsc_tools())
            {
                chatHelper chatHelper = new chatHelper();
                var chatHelperRecord = db.chatHelpers.Where(c => c.connectionId == connectionId).SingleOrDefault();
                if (chatHelperRecord != null)
                {
                    chatHelperRecord.connectionId = "";
                    chatHelperRecord.currentChats = 0;
                    chatHelperRecord.onlineStatus = "Offline";
                }
                db.Entry(chatHelperRecord).CurrentValues.SetValues(chatHelperRecord);
                db.SaveChanges();
                chatSession chatSession = new chatSession();
                foreach (var chatSessionRecord in db.chatSessions.Where(c => c.helperConnectionId == connectionId && c.completeDate == "").ToList())
                {
                    chatSessionRecord.completeDate = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH\\:mm\\:ssZ");
                }
                db.SaveChanges();
            }
        }

        /* Adds a user record to the users table if one does not exist already */
        public static void AddUserRecord(string userId, string userName)
        {
            using (tsc_tools db = new tsc_tools())
            {
                user user = new user();
                user.userId = userId;
                user.userName = userName;
                db.users.Add(user);
                db.SaveChanges();
            }
        }


        /* Checks for an available helper and connects them if ready */
        public static bool GetAvailableHelper(string smpSessionId, string userId, string userName, string connectionId, string flowName, string stepName)
        {
            Dictionary<string, string> returnInfo = new Dictionary<string, string>();
            using (tsc_tools db = new tsc_tools())
            {
                chatHelper chatHelper = new chatHelper();
                var chatHelperRecord =
                    (from c in db.chatHelpers
                     where c.onlineStatus == "Online"
                     select c
                    ).FirstOrDefault();
                if (chatHelperRecord == null)
                {
                    /* No Online Chat Helpers */
                    var context = GlobalHost.ConnectionManager.GetHubContext<MyHub>();
                    var time = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH\\:mm\\:ssZ");
                    context.Clients.Client(connectionId).throwMessage("Notice", "There are currently no chat helpers online.", false);
                    context.Clients.Client(connectionId).broadcastMessage(smpSessionId, time, "SYSTEM", "There are currently no chat helpers online.");
                    chatSession ChatSession = new chatSession();
                    ChatSession.chatGUID = Guid.NewGuid();
                    ChatSession.sashaSessionId = smpSessionId;
                    ChatSession.agentConnectionId = connectionId;
                    ChatSession.agentId = userId;
                    ChatSession.lastActivity = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH\\:mm\\:ssZ");
                    ChatSession.requestDate = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH\\:mm\\:ssZ");
                    ChatSession.flowName = flowName;
                    ChatSession.stepName = stepName;
                    db.chatSessions.Add(ChatSession);
                    db.SaveChanges();
                    return false;
                }
                chatHelperRecord =
                    (from c in db.chatHelpers
                     where c.onlineStatus == "Online"
                         && c.currentChats < c.maximumChats
                         && c.userId != userId
                     orderby c.lastChatTime ascending
                     select c
                    ).FirstOrDefault();
                if (chatHelperRecord == null)
                {
                    /* Helpers online but all at maximum sessions */
                    var context = GlobalHost.ConnectionManager.GetHubContext<MyHub>();
                    var time = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH\\:mm\\:ssZ");
                    context.Clients.Client(connectionId).throwMessage("Notice", "All available chat helpers are busy.", false);
                    context.Clients.Client(connectionId).broadcastMessage(smpSessionId, time, "SYSTEM", "All chat helpers are busy.");
                    chatSession ChatSession = new chatSession();
                    ChatSession.chatGUID = Guid.NewGuid();
                    ChatSession.sashaSessionId = smpSessionId;
                    ChatSession.agentConnectionId = connectionId;
                    ChatSession.agentId = userId;
                    ChatSession.lastActivity = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH\\:mm\\:ssZ");
                    ChatSession.requestDate = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH\\:mm\\:ssZ");
                    ChatSession.completeDate = "";
                    ChatSession.flowName = flowName;
                    ChatSession.stepName = stepName;
                    db.chatSessions.Add(ChatSession);
                    db.SaveChanges();
                    return false;
                }
                if (chatHelperRecord != null)
                {
                    string chatHelperId = chatHelperRecord.userId;
                    string chatHelperName = chatHelperRecord.user.userName;
                    string chatHelperConnectionId = chatHelperRecord.connectionId;
                    string lastChatTime = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH\\:mm\\:ssZ");
                    int currentChats = chatHelperRecord.currentChats + 1;
                    /* Helper Found */
                    var time = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH\\:mm\\:ssZ");
                    var context = GlobalHost.ConnectionManager.GetHubContext<MyHub>();
                    context.Clients.Client(connectionId).broadcastMessage(smpSessionId, time, chatHelperName, "Hello " + userName + " how may I assist you?");
                    returnInfo.Add("Available", "True");
                    returnInfo.Add("chatHelperId", chatHelperId);
                    returnInfo.Add("chatHelperName", chatHelperName);
                    chatHelperRecord.currentChats = currentChats;
                    db.Entry(chatHelperRecord).CurrentValues.SetValues(chatHelperRecord);
                    db.SaveChanges();
                    chatSession ChatSession = new chatSession();
                    ChatSession.chatGUID = Guid.NewGuid();
                    ChatSession.sashaSessionId = smpSessionId;
                    ChatSession.agentConnectionId = connectionId;
                    ChatSession.helperConnectionId = chatHelperConnectionId;
                    ChatSession.agentId = userId;
                    ChatSession.helperId = chatHelperId;
                    ChatSession.lastActivity = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH\\:mm\\:ssZ");
                    ChatSession.requestDate = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH\\:mm\\:ssZ");
                    ChatSession.completeDate = "";
                    ChatSession.flowName = flowName;
                    ChatSession.stepName = stepName;
                    db.chatSessions.Add(ChatSession);
                    db.SaveChanges();
                    context.Groups.Add(chatHelperConnectionId, smpSessionId);
                    context.Clients.Client(chatHelperConnectionId).addChatTab(smpSessionId, userName, "pull");
                }
                return true;
            }
        }

        public static void ToggleHelperStatus(string connectionId, string status)
        {
            using (tsc_tools db = new tsc_tools())
            {
                chatHelper chatHelper = new chatHelper();
                var chatHelperRecord =
                    (from c in db.chatHelpers
                     where c.connectionId == connectionId
                     select c
                    ).FirstOrDefault();
                if (chatHelperRecord != null)
                {
                    chatHelperRecord.onlineStatus = status;
                }
                db.Entry(chatHelperRecord).CurrentValues.SetValues(chatHelperRecord);
                db.SaveChanges();
            }
        }

        /* Returns a table of unseen announcements */
        public static string checkAnnouncements(string userId)
        {
            using (tsc_tools db = new tsc_tools())
            {
                annoucement announcement = new annoucement();
                var unseenAnnouncements = db.annoucements.OrderByDescending(a => a.enteredDate).Where(a => !a.seenBy.Contains("|" + userId + "|")).Select(a => new { a.enteredDate, a.user.userName, a.announcementText });
                var json = JsonConvert.SerializeObject(unseenAnnouncements);
                foreach (var announcementRecord in db.annoucements.Where(a => !a.seenBy.Contains("|" + userId + "|")).ToList())
                {
                    string seenBy = announcementRecord.seenBy;
                    announcementRecord.seenBy = seenBy + "|" + userId + "|";
                    db.Entry(announcementRecord).CurrentValues.SetValues(announcementRecord);
                    db.SaveChanges();
                }
                return json;
            }
        }

        public static void pushChat(string connectionId, string requesterConnectionId, string requesterName)
        {
            using (tsc_tools db = new tsc_tools())
            {
                sashaSession sashaSession = new sashaSession();
                var sashaSessionRecord =
                    (from s in db.sashaSessions
                     where s.connectionId == connectionId
                     select s
                    ).FirstOrDefault();
                if (sashaSessionRecord != null)
                {
                    string smpSessionId = sashaSessionRecord.smpSessionId;
                    string userName = sashaSessionRecord.user.userName;
                    var context = GlobalHost.ConnectionManager.GetHubContext<MyHub>();
                    context.Groups.Add(requesterConnectionId, smpSessionId);
                    context.Clients.Client(requesterConnectionId).addChatTab(smpSessionId, userName, "push");
                    context.Clients.Client(connectionId).requestChat(requesterName, requesterConnectionId);
                }
            }
        }
    }
}