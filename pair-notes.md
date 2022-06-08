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
    - 



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

