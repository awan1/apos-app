# Notes from pair programming 20220606-07

Goal: persist comments into DB for CMS prototyping work

Current state: comments can be made on the editor. However, when saving the content, the comments get removed
from the HTML that is saved.

Code path:

- Making edits to content triggers `emitWidgetUpdate()` in `AposRichTextWidgetEditor.vue` on every change to content. This includes whenever a comment is added.
- `emitWidgetUpdate()` triggers the `update(widget)` method in `AposAreaEditor`. This in turn triggers `onContextEdited` in `TheAposContextBar.vue`, which calls `save()` in the same file.
- `save()` calls `apos.http.patch`, passing in patches since the previous save, and updates `this.context` to the returned value `doc`
- The patch call contains the body with the comments, but the returned value from the patch call `doc` does not contain the comments:

Patch call `body` (which equals `patchesSinceSave`):
```
_advisoryLock: {tabId: 'cl3lx2r4k00063f6268ekl86i', lock: true}
_patches: Array(1)
  0:
    @cl3eyj2h4000i3f62xyu48exz: Object
      content: "<h3>Testing</h3><p>abcLorem ipsu<span data-comment=\"{&quot;uuid&quot;:&quot;06e542b9-9394-487c-ae0c-d41fc91f97d5&quot;,&quot;comments&quot;:[{&quot;username&quot;:&quot;jibae&quot;,&quot;time&quot;:1654638105975,&quot;content&quot;:&quot;sdf&quot;}]}\">m dolo</span>r sit amet, consectetur adipiscing elit. Quisque rutrum, justo sit amet accumsan ultrices, nisl lacus mattis mauris, eget pellentesque sapien erat eget dolor. Pellentesque habitant morbi tristique senectus et netuss et malesuada fames ac turpis egestas. Cras pretium gravida purus, eu vehicula lectus efficitur vitae. Pellentesque id dignissim urna. Nulla aliquam convallis ipsum, nec gravida est gravida non. Curabitur mollis dignissim eros, eget lobortis tortor posuere indf</p><p><br /></p>"
      metaType: "widget"
      type: (...)
      _docId: (...)
      _edit: (...)
      _id: (...)
```

Returned value `doc`:
```
{_id: 'cl3dp092h0004r6db4chvcu72:en:draft', title: 'Home', main: {…}, slug: '/', type: '@apostrophecms/home-page', …}
    advisoryLock: (...)
    aposDocId: (...)
    aposLocale: (...)
    aposMode: (...)
    archived: (...)
    cacheInvalidatedAt: (...)
    createdAt: (...)
    highSearchText: (...)
    highSearchWords: (...)
    historicUrls: (...)
    lastPublishedAt: (...)
    level: (...)
    lowSearchText: (...)
    main: Object
        items: Array(2)
            0:
                content: "<h3>Testing</h3><p>abcLorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque rutrum, justo sit amet accumsan ultrices, nisl lacus mattis mauris, eget pellentesque sapien erat eget dolor. Pellentesque habitant morbi tristique senectus et netuss et malesuada fames ac turpis egestas. Cras pretium gravida purus, eu vehicula lectus efficitur vitae. Pellentesque id dignissim urna. Nulla aliquam convallis ipsum, nec gravida est gravida non. Curabitur mollis dignissim eros, eget lobortis tortor posuere indf</p><p><br /></p>"
                metaType: (...)
                type: (...)
                _docId: (...)
                _edit: (...)
                _id: (...)
```

- Therefore, to understand why comments aren't being persisted, we look into what `apos.http.patch` does, and why it does not persist the comments in the body.

- `/apostrophe/modules/@apostrophecms/page/index.js` implements `async patch`. The method returns the result of `findOneForEditing`, which looks to just pull a page from the db. So elsewhere in the method is the call to saving the changes to the DB.
- Candidates are `self.applyPatch` and `self.update`
- `self.applyPatch` applies each patch, and then on the last patch `self.update` persists it to DB
- When we printed out `page.main.items` before and after doing `applyPatch`, we saw that the `page.main.items[0].content` html did not get updated to contain the comments.
- Looking at `applyPatch`: the `input` parameter should contain the patch information, which has the comments in `content`
- Experiment: see if `applyPatch` records the changes to text. Result: page before/after `applyPatch` did show a change in the text content. So it's just the changes to the comments that are being pulled out.

In `applyPatch`
- `apos.schema.implementPatchOperators`
- `apos.schema.subsetSchemaForPatch`: looks like it generates schema to be used in updating. The schema doesn't seem to exclude the `content` field, since based on the previous experiment it does record changes to the text content.
- `apos.schema.convert`: This looks at each field of the given schema and looks for a conversion function that matches the field's type. In our case, the relevant field type is `area`. The conversion functions are specified in `@apostrophecms/schema/lib/addFieldTypes.js`, which is called by the `schema` module's constructor.
  - `addFieldTypes` does `addFieldType` for `'area'`, which specifies `convert`. 
- `input` contains the patch information. In the body of this function, fields are added to it:

`input` at the beginning of `applyPatch`
```
  '@cl3eyj2h4000i3f62xyu48exz': {
    _id: 'cl3eyj2h4000i3f62xyu48exz',
    metaType: 'widget',
    type: '@apostrophecms/rich-text',
    content: '<h3>Testing</h3><p>bru<span data-comment="{&quot;uuid&quot;:&quot;eec975ee-2c3f-4681-a696-b2f35bda72e9&quot;,&quot;comments&quot;:[{&quot;username&quot;:&quot;jibae&quot;,&quot;time&quot;:1654643838680,&quot;content&quot;:&quot;fewf&quot;}]}">h</span></p><p><br /></p>',
    _edit: true,
    _docId: 'cl3dp092h0004r6db4chvcu72:en:draft'
  },
  slug: '/',
  parkedId: 'home'
}
```

`input` when it is passed into `convert` (where it becomes `data`):
```
{
  ... same as above ...,
  main: {
    _id: 'cl3eyiwnv000htzdb4unjg4gl',
    items: [ [Object], [Object] ],
    metaType: 'area',
    _edit: true,
    _docId: 'cl3dp092h0004r6db4chvcu72:en:draft'
  }
}
```
 
- The stuff added to `input` looks like `page` pulled from the DB in the `patch` method using `findOneForEditing`
- (general impression note: It's very annoying that JS likes to pass objects into methods where they get modified, without telling you that they're being modified in that method. Or maybe this is just a code quality issue. Or maybe it's something you get used to.)

- We figured it out! The comments are being stripped out in `addFieldTypes.js`, in `convert`, by `apos.area.sanitizeItems`.

`sanitizeItems`
- Sanitization happens using `manager.sanitize`. `manager` is `getWidgetManager(item.type)`
- These widget managers are registered by each widget, e.g. in `@apostrophecms/rich-text-widget/index.js`
- The rich text widget sanitizer doesn't allow adding spans.

EOD Tue (20220607):
- We modified the `rich-text-widget` sanitizer to allow `span` and the `'data-comment'` attribute under spans. This caused the "before applyPatch" and "after applyPatch" console log lines to correctly show the HTML with the comment annotation.
- However, when we reloaded the page, the content was showing up with the `<span>`s in the right place, but without the `data-comment` attribute.
- In addition, we realized that we may need to persist the Mark objects representing the comments, since these contain a superset of information from the HTML.
- So, next steps here would be:
  - Figure out how to perist the Mark objects
  - Make sure these Mark objects are processed on page load, such that comments show up
- We are not further exploring how to persist the HTML objects, because looking beyond the prototype we would likely want to have access to the comment objects, e.g. to find comments that are pending a user's attention, to handle threads, etc. In those cases, it seems insufficient to just have comments be part of the page HTML.

20220608
What to store
{
    uuid
    widgetId
    docId (maybe redundant)
    
    // maybe use a string list of size 1
    // to kind of account for threading in the future
    comment: string
    
    from: int
    to: int
    createdAt: datetime
}

When to save comments to db
- Approach 1: When the page is "published"
    - 
- Approach 2: Whenever the page is autosaved, and when the page is published
    - Preferable. Probably doesn't take much more work than Approach 1.
    - `onUpdate` --> `editorUpdate`: After

How to save comments in db
- Approach 1: save the comments in the `doc` object.
  - Then in editor `onCreate`, we can call `findCommentsAndStoreValues`, as currently written, since the comments will be in the `doc` object.
  - This is appealing, but it seems like we might not save the `editor.state.doc` to the db. It looks like Apos stores the content and then uses that to initialize the editor.
- Approach 2: save the comments separately from the doc.
  - Then in editor `onCreate`, we have to load up the comments and then apply them to the current doc.
  - Storing the comments in its own "table" and then using an ID to link a comment to the object it's associated with seems to be the relational DB way of doing things; when previewing the page object in the mongoDB, it felt more natural to store each comment directly with the object that it's assoicated with, leading to Approach 3 below.
- Approach 3: save the comments in the page object, e.g. associated with the widget.
  - Will need to see how to load these comments up. Depends on what the editor receives when it's initialized.
  - Maybe most idiomatic in NoRel DBs? Also simpler for prototyping (since the drawback is it's harder to support functionality that looks at all comments in the system, but we're not worrying about that for prototyping so it's a non-factor).


Goal: be able to save comments and then load them back up.
- Need to look into what the editor is initialized with. We will want to save the comments in a way such that the editor has access to them when it is created.
- 

How does the `AposRichTextWidgetEditor` get its content?
- `AposRichTextWidgetEditor`: Content is in `this.value`, which is a prop.
- `AposAreaWidget`: `AposRichTextWidgetEditor` is held by `AposAreaWidget`, which passes `value = widget`. `widget` is a prop.
- `AposAreaEditor`: `AposAreaWidget` is held by `AposAreaEditor`, which passes `widget` using the values of the array called `next`. `next` is derived from `this.getValidItems()`, which uses `this.items`, which is a prop
- Nothing is explicitly holding an `AposAreaEditor`...
- Looking at all occurrences of `:items=`, it appears that `AposInputArea` is what holds the `AposAreaEditor`. It holds a `Component` that says it "is an EditorComponent", and `@apostrophecms/area/index.js` does contain the string `'AposAreaEditor'`. So maybe this file allows the `AposInputArea` to instantiate an `AposAreaEditor`.
  - Gripe: using the `:is` makes it harder to see what the components being used are / trace the code. In general, it's difficult to trace the origin of certain data with the lack of code analysis tools (e.g. can't cmd+click into anything).
  - Using the Vue devtools chrome extension, we can see the chain of objects from `AposAreaEditor` down to `AposRichTextWidgetEditor`.
- `AposInputArea`: passes `next.items`. `next` comes from `this.value.data`. `this.value` seems to come from `AposInputMixin`, which says that `value` is a prop from the parent component.
- ... having trouble finding the top of the tree. Through looking at the devtools console, the visible part of the page corresponds to `outerLayoutBase.html`, which maybe could be used to figure out what makes that html be shown?
- 


- During work, changes to files in the core library stopped being picked up after `npm i`. Removing `node_modules` didn't help. Quite frustrating.
- Since we weren't able to find the top of the tree, we decided to see if we could just change the `items` object that was eventually being loaded. The thought process here is, if we can persist the comments to that object, we will likely have access to those fields when the editor is initialized

- Hardcoded a change to the object in `TheAposContextBar.save`. Saw in the browser console that the field was being added (though strangely it was present in logs both before and after the field was added...)
- Saw that it wasn't being persisted by removing that line and rerunning. Also confirmed that it was not being added to the DB.

Next steps:
- Continue trying to get the comment to persist in the DB, attached to the item.

20220609
- The `input` variable fed into the `applyPatch` call within `patch` in `page/index.js` looks like the following:
{
  '@cl3eyj2h4000i3f62xyu48exz': {
    _id: 'cl3eyj2h4000i3f62xyu48exz',
    metaType: 'widget',
    type: '@apostrophecms/rich-text',
    content: '<h3>Testing</h3><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commoda</p>',
    _edit: true,
    _docId: 'cl3dp092h0004r6db4chvcu72:en:draft',
    comments: 'no way jose'
  },
  slug: '/',
  parkedId: 'home'
}
- After `applyPatch` is called from `patch` above, `page.main.items[0]` looks like the following:
{
  _id: 'cl3eyj2h4000i3f62xyu48exz',
  metaType: 'widget',
  type: '@apostrophecms/rich-text',
  content: '<h3>Testing</h3><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commoda</p>'
}
- After `applyPatch`, the `page` object is supposed to have the updated values from `input`. It seems that `sanitizeItems` in `area/index.js`, which is called by `convert` for the `area` field type in `addFieldTypes.js`, is stripping out the `comments` field, similarly to how span tags were stripped out of the content html we were trying to persist on 06/07. 

- The `comments` field wasn't being used when constructing the `output` object in the `sanitize` method in `rich-text-widget/index.js`.
- So, the solution is simply to add a line `output.comments = input.comments` in the `sanitize` method.
- Confirmed that doing the above successfully persists comments to the db!
- Needed to remove the `node` from the `tempComment` because `klona` was giving stack depth errors when parsing patches that contained comments that contained the doc nodes.
- After successfully persisting comments to DB, on page load, we used Vue DevTools to look at the `value` that `AposRichTextWidgetEditor` was being initialized with, and it contained the `comments` array!

Displaying stored comments on page load
- Idea: for each stored comment, use Tiptap's `editor.commands.setTextSelection` to highlight the text corresponding to the comment, and then use code from `saveComment`, specifically `this.editor.chain().setComment(comment).run()`. (This seems to set the comment at the currently highlighted text.)

EOD 20220609
- We were able to persist comments to the DB, and get it to load when the page loaded
- However, we were unable to use the retrieved comment to create a Mark in the editor. This causes the comment to disappear when edits are made to the editor.
- We're stopping work here because we've technically met the requirements, and have identified the gaps that would need to be filled when we do this for real. Also it's a data point that we spent 3+ hours trying to get the stored comment to convert to a Mark with no luck. (we would probably want to ask the Apos/TipTap community for help at this point, since it seems to be a problem with creating the mark / using `editor.setComment`)

-----

(maybe these aren't needed any more since the save path is triggered on content change, not just on clicking `Update`)
- Clicking `Update` button calls `onPublish` in `TheAposContextBar.vue` 
- This calls `publish` in `/apostrophe/modules/@apostrophecms/ui/ui/apos/mixins/AposPublishMixin.js`, via the `mixins` definition at the top of the `TheAposContextBar`
- 

data in the area convert function
{
  '@cl3eyj2h4000i3f62xyu48exz': {
    _id: 'cl3eyj2h4000i3f62xyu48exz',
    metaType: 'widget',
    type: '@apostrophecms/rich-text',
    content: '<h3>Testing</h3><p>br<span data-comment="{&quot;uuid&quot;:&quot;1e7d5fee-54e2-43dc-983e-2c92aa1d4fff&quot;,&quot;comments&quot;:[{&quot;username&quot;:&quot;jibae&quot;,&quot;time&quot;:1654642688940,&quot;content&quot;:&quot;sdf&quot;}]}">uh</span></p><p><br /></p>',
    _edit: true,
    _docId: 'cl3dp092h0004r6db4chvcu72:en:draft'
  },
  slug: '/',
  parkedId: 'home'
}


schema passed into schema's convert()
[
  {
    name: 'main',
    type: 'area',
    options: { widgets: [Object] },
    group: { name: 'basics', label: 'Basics' },
    moduleName: '@apostrophecms/home-page',
    label: 'Main',
    _id: '237392f34f4754557bec86b3905823f6',
    def: undefined
  }
]

self.fieldTypes in schema's convert()
{
  area: {
    name: 'area',
    convert: [AsyncFunction: convert],
    isEmpty: [Function: isEmpty],
    isEqual: [Function: isEqual],
    validate: [Function: validate],
    empty: [Function: isEmpty]
  },
  string: {
    name: 'string',
    convert: [Function: convert],
    index: [Function: index],
    isEmpty: [Function: isEmpty],
    addQueryBuilder: [Function: addQueryBuilder],
    def: '',
    empty: [Function: isEmpty]
  }...
}

