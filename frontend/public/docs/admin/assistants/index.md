# The Assistants Page

## What is an Assistant?

From a user's perspective, an assistant is a virtual expert you can have a conversation with. From a technical perspective, it is a set of extensions (models, tools etc.) that, in combination, provide information access with a natural language interface.

## Do I need one or many Assistants?

**Any minimal working setup will require you to setup at least one Assistant.**

Assistants are highly customizable, allowing you to create different assistants tailored to your specific needs. You can create a new assistant from scratch, or duplicate and adapt an existing one.

### How customizable are Assistants?

- **Configure abilities of the Assistant** via Extensions:

	- **LLM Chat Model**
	  -- select which LLM API to connect for processing the chat itself.

	- **Files (in Chat)**
	  -- allows file uploads etc.

	- **Dall-E**
	  -- allows generating images.

	- **Bing Web Search**
	  -- to enable the chat to search on the internet (with a Bing API key).

	- **And more extensions...**


- **User Management and Convenience** via Assistant Settings:

	- **Restricted Access**
	  -- User groups or the general enable-toggle regulate, which Assistant is available to whom.

	- **Chat Prompt Suggestions**
	  -- Configure a small catalog of well working questions for the assistant, that users may select by clicking instead of typing them over and over again.

	- **Hints and Disclaimers**
	  -- A text, that is rendered below the input in the main chat view.


## How to setup or edit an Assistant?

Hover over assistant entries and click the icon for more options, which will become visible on their right. Then choose the "Edit", "Duplicate" or the "Remove" option.

**If you want to remove or edit an actively used Assistant, consider using the "Duplicate" option and the "Enabled" setting instead,** since there is no undo-feature for changes or deletions.

### Creating a new Assistant

**If a similar Assistant, to the one you desire is already setup duplicate it and edit it to fit your needs.** Otherwise, use the plus symbol next to the word Assistants at the top of the Assistants page to create a new Assistant. Notice that all extension configurations will be copied along with the duplicated Assistant.

**Tip: During the setup process you may hide new assistants from users via the "Enabled" setting or "User Groups". E.g. assign the assistant to the group "Admin".**

## Import and Export of Assistants

### Export

Hover over assistant entries and click the icon for more options, which will become visible on their right. This menu will offer an "Export" option, which starts the download of a `{assitant name}.json` file. Note that secrets like API-Keys will be redacted.

### Import

Use the "arrow up" symbol next to the word Assistants at the top of the Assistants page to import a `*.json` file with the assistant configuration. Note that an unmodified export will have redacted secrets like API-Keys, such that some services might not work. However, if you upload a `*.json` with correct values for the secrets, they will be imported into the new Assistant and work as expected.

#### Assistant Settings

| Setting           | Description                       |
|-------------------|-----------------------------------|
| Name              | **Required** name, that will be visible to users in the Assistant selection.
| Description       | **Required** short description, that will be visible to users in the Assistant selection.
| Enabled           | If not enabled, an assistant will only be visible on the settings page for configuration. Any conversation held with a disabled Assistant can still be read, but not continued by the user.
| User Groups       | Restrict the access to the assistant to certain [user groups](/admin/user-groups). Members of the "Admin" group will be able to access an Assistant, even if the "Admin" group is not listed here.
| Executor Endpoint | An advanced setting: It is used to move the assistant handling to another execution server. (no extensions are used for this)
| Executor Headers  | An advanced setting: This defines the required headers needed for the execution server.
| Chat Footer       | Text, that is rendered below the input in the main chat view. Additionally, a text from the [theme settings](/admin/theme) may be displayed next to it.
| Suggestions       | AI Assistant specific prompt suggestions that will be available when starting a new conversation with the Assistant. Additionally, suggestions from the [theme settings](/admin/theme) may be displayed.

---

# Extensions

## What are Extensions?

Extensions are the building blocks for your assistants. An extension can be:
* a model, used for language model integration,
* a tool, which will be used by the language model to extend its functionality (e.g. to access domain knowledge),
* some prompt extensions, to configure additional instructions for each llm call.

**It is mandatory to add exactly one of the model extensions**, while other extensions are optional.
This is because any working Assistant Setup needs an LLM Model to drive the chat.

## How to Add, Edit or Remove Extensions

Once you have selected an Assistant, its extensions will be listed on the right. To edit an extension, click it and press save after adjusting the settings.

Extensions can generally be enabled, disabled or removed. When removing an extension, be aware that this action is permanent and cannot be undone. To avoid accidentally deleting an extension, it is recommended to use the enable toggle to disable the extension instead of deleting it. This way, the extension can be easily re-enabled if needed.

To apply changes to any Extension, click the "Save" button in the lower right corner. Some Extensions offer a "Test" button, which can help you verify the configuration you provided is valid, before saving it.


## Most Used Extensions

### The Azure OpenAI Model Extension
Connect to an LLM on Azure, that will do the talking.
| Setting                | Description                          |
|------------------------|--------------------------------------|
| API Key                | The key for your OpenAI LLM deployment on Azure
| Deployment Name        | As configured on Azure
| Instance Name          | As configured on Azure
| API Version            | The version of the Deployment on Azure
| Temperature            | Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.
| Presence Penalty       | Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.
| Frequency Penalty      | Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.

### The Mistral Model Extension
Connect to an LLM by Mistral, that will do the talking.
| Setting                | Description                          |
|------------------------|--------------------------------------|
| API Key                | You own OpenAI API Key from [mistral.ai](https://mistral.ai/)
| Model Name             | Choose the model you want to use.

*For the most stable environment via c4 we recommend using the "Azure-OpenAI" extension instead.*

### Bing Web Search
Enable the chat to search on the internet (with a Bing API key).

### The Azure Dall-E
Allows generating images.
| Setting                | Description                          |
|------------------------|--------------------------------------|
| API Key                | The key for your Dall-E deployment on Azure
| Model Name             | Make sure you have deployment the model you select here on Azure.
| Style                  | The style of the generated images. Must be one of vivid or natural. Vivid causes the model to lean towards generating hyper-real and dramatic images. Natural causes the model to produce more natural, less hyper-real looking images.
| Quality                | The quality of the image that will be generated. hd creates images with finer details and greater consistency across the image.
| Size                   | The size of the generated image. Must be one of 256x256, 512x512, or 1024x1024 for DALL·E-2 models. Must be one of 1024x1024, 1792x1024, or 1024x1792 for DALL·E-3 models.
| Instance Name          | As configured on Azure
| API Version            | The version of the Deployment on Azure

*If you want to use an OpenAI API Key instead, use the "Dall-E" extension*

### The Dall-E
Allows generating images.
| Setting                | Description                          |
|------------------------|--------------------------------------|
| API Key                | You own OpenAI API Key
| Model Name             | Choose the model you want to use.
| Style                  | The style of the generated images. Must be one of vivid or natural. Vivid causes the model to lean towards generating hyper-real and dramatic images. Natural causes the model to produce more natural, less hyper-real looking images.
| Quality                | The quality of the image that will be generated. hd creates images with finer details and greater consistency across the image.
| Size                   | The size of the generated image. Must be one of 256x256, 512x512, or 1024x1024 for DALL·E-2 models. Must be one of 1024x1024, 1792x1024, or 1024x1792 for DALL·E-3 models.

*If you want to use Dall-E via Azure, use the "Azure Dall-E" extension*

### Extension for Interacting with Files
Files are usually managed via buckets, which need to be set up in the ["Files"](/admin/files) settings.

**"Files" Extension for General or User Buckets:**
| Setting                | Description                          |
|------------------------|--------------------------------------|
| Description            | An explanation for the assistant, such that it understand what you setup this extension for, and what files it should expect via this instance of the extension.
| **Bucket**             | Select one of the **general**-buckets or **user**-buckets created in the ["Files" settings](/admin/files)
| Take                   | The number of most relevant document sections from one or many files, which will be provided to the assistant. Less relevant document sections are ignored in the assistants answer to improve its quality.

**"Files in Chat" Extension for Chat Buckets:**
| Setting                | Description                          |
|------------------------|--------------------------------------|
| **Bucket**             | Select one of the **conversation**-buckets created in the ["Files" settings](/admin/files)
| Max. Files             | Maximum number of files to upload in a conversation.
| Show sources           | Additionally to the visualisation of the list of uploaded files, you may choose to have the list of actually used documents and pages displayed below your assistants answers.

**"Complete Files" Extension for Chat Buckets:**
| Setting                | Description                          |
|------------------------|--------------------------------------|
| **Bucket**             | Select one of the **conversation**-buckets created in the ["Files" settings](/admin/files)
| Max. Files             | Maximum number of files to upload in a conversation.

**"Vision" Extension for showing images to the LLM:**
| Setting                | Description                          |
|------------------------|--------------------------------------|
| Supported file types   | Image types to accept.
| Max. Images            | Maximum number of images to upload in a conversation.

#### Find the Files Tool That Fits Best
**UX Comparison of Bucket Types in Action:**
| general-bucket                   | user-bucket                                     | conversation-bucket                             |
|----------------------------------|-------------------------------------------------|-------------------------------------------------|
| a more knowledgeable assistant   | a menu for selecting files                      | a paperclip icon for uploads                    |
| no visible UI elements for users | ![icon](/docs/admin/assistants/user-bucket.png) | ![menu](/docs/admin/assistants/chat-bucket.png) |

**List of File-Management-Tools**

| bucket type  | tool           | visible result for the user                                   |
|--------------|----------------|---------------------------------------------------------------|
| general      | Files          | a more knowledgeable AI assistant to chat with.               |
| user         | Files          | a menu for selecting files or uploading to all conversations. |
| conversation | Files in Chat  | a **paperclip** icon for attaching files to chat questions.   |
| conversation | Complete Files | a **paperclip** icon for attaching files to chat questions.   |
| no bucket    | Vision         | a **paperclip** icon for attaching images to chat questions.  |

**The Paperclip Options**

Three tools allow uploading files via the same paperclip ui, see the differences below.

| Difference     | Files in Chat                     | Complete Files                                 | Vision                                                                                                 |
|----------------|-----------------------------------|------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| Ideal for ...  | searching on many pages/documents | summarizing a file                             | recognizing things in images                                                                           |
| Research Scope | most relevant extracts            | the complete file                              | the attached image                                                                                     |
| Cost / Tokens  | the larger the files, the cheaper | the larger the files, the more expensive       | images are generally more expensive than short texts                                                   |
| Limits         | supports large/multiple files     | no support for multiple (or too large) files\* | images might be scaled and cropped automatically before being processed by the model, only png and jpg |

\**limited by input tokens of the LLM*

#### Compatability

Some of the file tools are incompatible.

- "Files in Chat" and "User Files" can not be combined
- "Files in Chat" and "Complete Files" can not be combined
- The same file extension may only be configured once per Assistant, with the notable exception of "Files", which may configure multiple `general` buckets combined with one `user` bucket

## Custom Extensions

c4 supports the integration of custom extensions. These can be tailored to your specific needs and will be available to your company only. Please contact your service owner for details.
