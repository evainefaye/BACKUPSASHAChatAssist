using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace SASHAChatAssist
{
    public class Database
    {

        /* Sets Database tables to an initialized state on application startup
            Empties records from table sashaSessionRecords
            Empties records from table chatSessionRecords
            sets connectionStatus to "notConnected" for any records in chatHelpers
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
                    chatHelperRecord.connectionStatus = "notConnected";
                }
            }
        }
    }
}