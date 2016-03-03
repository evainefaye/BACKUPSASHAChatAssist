Combine the AddSignalR, RequestDictionaryValues, SlideeChatJavaScript and SlideChatCSS into one script node that is
loaded only one time (does no need to be part of dashboard as these exist for the life of the SASAHA Session.

These scripts will setup basic functionality.

Add AttachMonitor as a one time script that is called at the point you consider the SASHA session to have begun.

UpdateMonitor can be added at any time after AddSignalR,RequestDictionaryValues, and SlideChatJavaScript have been added but must be
on any screen where you want this information to update (suggest on the DBView)

