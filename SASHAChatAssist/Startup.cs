using Microsoft.Owin.Cors;
using Microsoft.Owin;
using Owin;
using Microsoft.AspNet.SignalR;
using System.Data.Entity;


[assembly: OwinStartup(typeof(SASHAChatAssist.Startup))]

namespace SASHAChatAssist
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            HubConfiguration hubConfiguration = new HubConfiguration();
            hubConfiguration.EnableDetailedErrors = true;
            app.UseCors(CorsOptions.AllowAll);
            app.MapSignalR(hubConfiguration);

            // Clear Database tables at Startup [sashaSessions] 
            // Database.ClearSashaSessions();

        }
    }
}
