//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated from a template.
//
//     Manual changes to this file may cause unexpected behavior in your application.
//     Manual changes to this file will be overwritten if the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

namespace SASHAChatAssist
{
    using System;
    using System.Collections.Generic;
    
    public partial class chatSession
    {
        public System.Guid chatGUID { get; set; }
        public string sashaSessionId { get; set; }
        public string agentConnectionId { get; set; }
        public string helperConnectionId { get; set; }
        public string agentId { get; set; }
        public string helperId { get; set; }
        public string lastActivity { get; set; }
        public string requestDate { get; set; }
        public string completeDate { get; set; }
        public string flowName { get; set; }
        public string stepName { get; set; }
    
        public virtual user user { get; set; }
        public virtual user user1 { get; set; }
    }
}
