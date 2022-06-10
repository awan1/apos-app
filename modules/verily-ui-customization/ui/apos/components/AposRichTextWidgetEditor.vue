<template>
  <div class="apos-rich-text-editor__container">
    <section>
      <bubble-menu
        class="bubble-menu"
        :tippy-options="{ duration: 100 }"
        :editor="editor"
        v-if="editor"
      >
        <AposContextMenuDialog
          menu-placement="top"
          class-list="apos-rich-text-toolbar"
          :has-tip="false"
          :modifiers="['unpadded']"
        >
          <div class="apos-rich-text-toolbar__inner">
            <component
              v-for="(item, index) in toolbar"
              :key="item + '-' + index"
              :is="(tools[item] && tools[item].component) || 'AposTiptapUndefined'"
              :name="item"
              :tool="tools[item]"
              :options="editorOptions"
              :editor="editor"
              @saveComment="saveComment"
            />
          </div>
          <!-- <button v-bind:onclick="test()">hoho</button> -->
        </AposContextMenuDialog>
      </bubble-menu>
      <div class="apos-rich-text-editor__editor" :class="editorModifiers">
        <editor-content :editor="editor" :class="editorOptions.className" />
      </div>
      <div class="apos-rich-text-editor__editor_after" :class="editorModifiers">
        {{ $t('apostrophe:emptyRichTextWidget') }}
      </div>
    </section>
    <section class="apos-outer-comment">
      <AposOuterComment
        :active-comments-instance="activeCommentsInstance"
        :all-comments="allComments"
        :focus-content="focusContent"
        @saveComment="saveComment"
      />
    </section>
  </div>

</template>

<script>
import {
  Editor,
  EditorContent,
  BubbleMenu
} from '@tiptap/vue-2';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { v4 as uuidv4 } from 'uuid';
import AposOuterComment from '../../../../../apos-build/default/apos/modules/verily-ui-customization/components/AposOuterComment.vue';
export default {
  name: 'AposRichTextWidgetEditor',
  components: {
    EditorContent,
    BubbleMenu,
    AposOuterComment
},
  props: {
    type: {
      type: String,
      required: true
    },
    options: {
      type: Object,
      required: true
    },
    value: {
      type: Object,
      default() {
        return {};
      }
    },
    docId: {
      type: String,
      required: false,
      default() {
        return null;
      }
    },
    focused: {
      type: Boolean,
      default: false
    }
  },
  emits: [ 'update' ],
  data() {
    return {
      editor: null,
      docFields: {
        data: {
          ...this.value
        },
        hasErrors: false
      },
      pending: null,
      activeCommentsInstance: {},
      allComments: [],
      showCommentMenu: false,
      isTextSelected: false,
      skipOnSelectionUpdate: false,
      skipEditorUpdate: false
    };
  },
  computed: {
    moduleOptions() {
      console.log('this');
      console.log(this);
      console.log('apos');
      console.log(apos);
      console.log('apos.modules');
      console.log(apos.modules);
      console.log('apos.area.widgetManagers');
      console.log(apos.area.widgetManagers);
      console.log('this.type');
      console.log(this.type);
      return apos.modules[apos.area.widgetManagers[this.type]];
    },
    defaultOptions() {
      return this.moduleOptions.defaultOptions;
    },
    editorOptions() {
      const activeOptions = Object.assign({}, this.options);
      console.log('this.options');
      console.log(this.options);

      // Allow toolbar option to pass through if `false`
      activeOptions.toolbar = (activeOptions.toolbar !== undefined)
        ? activeOptions.toolbar : this.defaultOptions.toolbar;

      activeOptions.styles = this.enhanceStyles(
        activeOptions.styles?.length
          ? activeOptions.styles
          : this.defaultOptions.styles
      );

      activeOptions.className = (activeOptions.className !== undefined)
        ? activeOptions.className : this.moduleOptions.className;

      console.log('activeOptions');
      console.log(activeOptions);
      return activeOptions;
    },
    autofocus() {
      // Only true for a new rich text widget
      return !this.stripPlaceholderBrs(this.value.content).length;
    },
    initialContent() {
      console.log('initialContent');
      console.log(this.value);

      const content = this.stripPlaceholderBrs(this.value.content);
      console.log(content);
      if (!content.length) {
        // If we don't supply a valid instance of the first style, then
        // the text align control will not work until the user manually
        // applies a style or refreshes the page
        const defaultStyle = this.editorOptions.styles.find(style => style.def);

        const _class = defaultStyle.class ? ` class="${defaultStyle.class}"` : '';
        return `<${defaultStyle.tag}${_class}></${defaultStyle.tag}>`;
      } else {
        return content;
      }
    },
    toolbar() {
      return this.editorOptions.toolbar;
    },
    tools() {
      return this.moduleOptions.tools;
    },
    isVisuallyEmpty () {
      const div = document.createElement('div');
      div.innerHTML = this.value.content;
      return !div.textContent;
    },
    editorModifiers () {
      const classes = [];
      if (this.isVisuallyEmpty) {
        classes.push('apos-is-visually-empty');
      }
      return classes;
    },
    tiptapTextCommands() {
      return this.moduleOptions.tiptapTextCommands;
    },
    tiptapTypes() {
      return this.moduleOptions.tiptapTypes;
    },
    aposTiptapExtensions() {
      return (apos.tiptapExtensions || [])
        .map(extension => extension({
          styles: this.editorOptions.styles.map(this.localizeStyle),
          types: this.tiptapTypes
        }));
    }
  },
  watch: {
    focused(newVal) {
      if (!newVal) {
        if (this.pending) {
          this.emitWidgetUpdate();
        }
      }
    }
  },
  mounted() {
    this.editor = new Editor({
      content: this.initialContent,
      autofocus: this.autofocus,
      onUpdate: this.editorUpdate,
      onSelectionUpdate: this.onSelectionUpdate,
      onCreate: this.onCreate,
      extensions: [
        StarterKit,
        TextAlign.configure({
          types: [ 'heading', 'paragraph' ]
        }),
        Highlight,
        TextStyle,
        Underline
      ].concat(this.aposTiptapExtensions)
    });
  },
  beforeDestroy() {
    this.editor.destroy();
  },
  methods: {
    saveComment(comment) {
      console.log('saveComment!');
      
      const localVal = comment;
      if (!localVal.trim().length) {
        return;
      }

      const activeCommentInstance = JSON.parse(JSON.stringify(this.activeCommentsInstance));
      const commentsArray = typeof activeCommentInstance.comments === 'string' ? JSON.parse(activeCommentInstance.comments) : activeCommentInstance.comments;
      // console.log('activeCommentInstance');
      // console.log(activeCommentInstance);
      // console.log('commentsArray');
      // console.log(commentsArray);

      if (commentsArray) {
        commentsArray.push({
          username: apos.login.user.username,
          time: Date.now(),
          content: localVal
        });

        const commentWithUuid = JSON.stringify({
          uuid: this.activeCommentsInstance.uuid || uuidv4(),
          comments: commentsArray
        });

        this.editor.chain().setComment(commentWithUuid).run();
      } else {
        const commentWithUuid = JSON.stringify({
          uuid: uuidv4(),
          comments: [{
            username: apos.login.user.username,
            time: Date.now(),
            content: localVal
          }]
        });

        console.log('saveComment: commentWithUuid:');
        console.log(commentWithUuid);
        this.editor.chain().setComment(commentWithUuid).run();
      }

      // const selection = this.editor.state.selection;
      // console.log(selection.$from);
      // console.log(selection.$to);
      
      // await apos.http.post('/api/v1/comment', {
      //     body: {
      //         title: 'test title',
      //         startIndex: input.anchorOffset,
      //         endIndex: input.focusOffset,
      //         // TODO: figure out why the logic for this above isn't working
      //         startRow: 0,
      //         comment: input.comment,
      //         commenterUsername: apos.login.user.username,
      //         richTextWidgetId: this.docId
      //     }
      // });

      // this.editor.commands.setHighlight();
    },
    focusContent(from, to) {
      this.editor.chain().setTextSelection({ from: from, to: to }).run();
    },
    // retrieves comments from `editor.state.doc` and stores them into `this.allComments`,
    // which is fed into `AposOuterComment` which then displays the comments.
    findCommentsAndStoreValues() {
      const tempComments = [];

      console.log('this.editor.state.doc');
      console.log(this.editor.state.doc);
      this.editor.state.doc.descendants((node, pos) => {
        const { marks } = node;

        marks.forEach((mark) => {
          if (mark.type.name === 'comment') {
            const markComments = mark.attrs.comment;
            const jsonComments = markComments ? JSON.parse(markComments) : null

            console.log('Storing jsonComments')
            console.log(jsonComments)

            if (jsonComments !== null) {
              tempComments.push({
                // node,  // Saving node here causes klona to error out with an exceeded max stack depth 
                jsonComments,
                from: pos,
                to: pos + (node.text?.length || 0),
                text: node.text,
                
                // editorComment: ????
              });
            }
          }
        })
      })

      this.allComments = tempComments;
    },
    setCurrentComment() {
      // console.log('editor.getText');
      // console.log(this.editor.getText());
      // console.log('editor.getAttributes');
      // console.log(this.editor.getAttributes('comment'));

      const widget = this.docFields.data;
      console.log('widget');
      console.log(widget);

      const newVal = this.editor.isActive('comment');
      if (!newVal) {
        this.activeCommentsInstance = {};
        return;
      }

      // setTimeout(() => (this.showCommentMenu = newVal), 50);
      const parsedComment = JSON.parse(this.editor.getAttributes('comment').comment);
      console.log(`this.editor.getAttributes('comment')`)
      console.log(this.editor.getAttributes('comment'))

      if (!parsedComment) {
        return;
      }
      console.log('non-null parsedComment:')
      console.log(parsedComment);
      parsedComment.comment = typeof parsedComment.comments === 'string' ? JSON.parse(parsedComment.comments) : parsedComment.comments;
      this.activeCommentsInstance = parsedComment;
    },
    addCommentsAsMarks() {
      console.log('addCommentsAsMarks')
      const comments = this.allComments
      this.skipOnSelectionUpdate = true;
      this.skipEditorUpdate = true;
      for (const comment of comments) {
        console.log('comment:')
        console.log(comment)
        console.log('addCommentsAsMarks: setTextSelection')
        this.editor.chain()
          .setTextSelection({ from: comment.from, to: comment.to })
          .run()
        console.log('addCommentsAsMarks: setComment')
        this.editor.chain()
          .setComment(JSON.stringify(comment.jsonComment))
          .run()
        console.log('this.allComments right after setComment');
        console.log(this.allComments);
      }
      this.skipOnSelectionUpdate = false;
      this.skipEditorUpdate = false;
      console.log('addCommentsAsMarks: done')
    },
    onCreate() {
      // this.findCommentsAndStoreValues();
      // If there are this.value.comments, add them into tempComments and then clear them out of this.value.comments
      if (this.value.comments) {
        this.allComments = this.value.comments
        this.value.comments = null;
      }
      this.addCommentsAsMarks()
    },
    onSelectionUpdate() {
      if (this.skipOnSelectionUpdate) {
        return;
      }
      console.log('on selection update');
      this.setCurrentComment();
      this.isTextSelected = !!this.editor.state.selection.content().size;
    },
    async editorUpdate() {
      if (this.skipEditorUpdate) {
        return;
      }
      
      console.log('on update');
      // Call in update to store changes in the comments' anchors, for example
      this.findCommentsAndStoreValues();
      this.setCurrentComment();

      // persist comments somehow

      // Hint that we are typing, even though we're going to
      // debounce the actual updates for performance
      if (this.docId === window.apos.adminBar.contextId) {
        apos.bus.$emit('context-editing');
      }
      // Debounce updates. We have our own plumbing for
      // this so that we can change our minds to update
      // right away if we lose focus.
      if (this.pending) {
        // Don't reset the timeout; we still want to save at
        // least once per second if the user is actively typing
        return;
      }
      this.pending = setTimeout(() => {
        this.emitWidgetUpdate();
      }, 1000);
    },
    emitWidgetUpdate() {
      if (this.pending) {
        clearTimeout(this.pending);
        this.pending = null;
      }
      let content = this.editor.getHTML();
      content = this.restorePlaceholderBrs(content);
      const widget = this.docFields.data;
      widget.content = content;
      widget.comments = this.allComments;
      // ... removes need for deep watching in parent
      this.$emit('update', { ...widget });
    },
    // Restore placeholder BRs for empty paragraphs. ProseMirror adds these
    // temporarily so the editing experience doesn't break due to contenteditable
    // issues with empty paragraphs, but strips them on save; however
    // seeing them while editing creates a WYSIWYG expectation
    // on the user's part, so we must maintain them
    restorePlaceholderBrs(html) {
      return html.replace(/<(p[^>]*)>(\s*)<\/p>/gi, '<$1><br /></p>');
    },
    // Strip the placeholder BRs again when populating the editor.
    // Otherwise they get doubled by ProseMirror
    stripPlaceholderBrs(html) {
      return html.replace(/<(p[^>]*)>\s*<br \/>\s*<\/p>/gi, '<$1></p>');
    },
    // Enhances the dev-defined styles list with tiptap
    // commands and parameters used internally.
    enhanceStyles(styles) {
      const self = this;
      (styles || []).forEach(style => {
        style.options = {};
        for (const key in self.tiptapTextCommands) {
          if (self.tiptapTextCommands[key].includes(style.tag)) {
            style.command = key;
          }
        }
        for (const key in self.tiptapTypes) {
          if (self.tiptapTypes[key].includes(style.tag)) {
            style.type = key;
          }
        }

        // Set heading level
        if (style.type === 'heading') {
          const level = parseInt(style.tag.split('h')[1]);
          style.options.level = level;
        }

        // Handle custom attributes
        if (style.class) {
          style.options.class = style.class;
        }

        if (!style.type) {
          apos.notify('apostrophe:richTextStyleConfigWarning', {
            type: 'warning',
            dismiss: true,
            icon: 'text-box-remove-icon',
            interpolate: {
              label: style.label,
              tag: style.tag
            }
          });
        }
      });

      // ensure a default so we can rely on it throughout
      const hasDefault = !!styles.find(style => style.def);
      if (!hasDefault && styles.length) {
        // If no dev set default, use the first paragraph we can find
        if (styles.filter(style => style.type === 'paragraph').length) {
          styles.filter(style => style.type === 'paragraph')[0].def = true;
        } else {
          // Otherwise, set the first style
          styles[0].def = true;
        }
      }
      return styles;
    },
    localizeStyle(style) {
      style.label = this.$t(style.label);

      return {
        ...style,
        label: this.$t(style.label)
      };
    }
  }
};

</script>

<style lang="scss" scoped>
  .apos-rich-text-editor__container {
    display: flex;
    justify-content: center;
  }

  .apos-rich-text-toolbar.editor-menu-bubble {
    z-index: $z-index-manager-toolbar;
    position: absolute;
    transform: translate3d(-50%, -50%, 0);
  }

  .apos-rich-text-toolbar.editor-menu-bar {
    display: inline-block;
    margin-bottom: 10px;
  }

  .apos-rich-text-toolbar__inner {
    display: flex;
    align-items: stretch;
    height: 35px;
    background-color: var(--a-background-primary);
    color: var(--a-text-primary);
    border-radius: var(--a-border-radius);
  }

  .apos-rich-text-toolbar ::v-deep .apos-is-active {
    background-color: var(--a-base-9);
  }

  .apos-rich-text-editor__editor ::v-deep .ProseMirror:focus {
    outline: none;
  }

  .apos-rich-text-editor__editor {
    @include apos-transition();
    position: relative;
    border-radius: var(--a-border-radius);
    box-shadow: 0 0 0 1px transparent;
  }
  .apos-rich-text-editor__editor.apos-is-visually-empty {
    box-shadow: 0 0 0 1px var(--a-primary-transparent-50);
  }
  .apos-rich-text-editor__editor_after {
    @include type-small;
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: block;
    width: 200px;
    height: 10px;
    margin: auto;
    margin-top: 7.5px;
    margin-bottom: 7.5px;
    color: var(--a-base-5);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-align: center;
    &.apos-is-visually-empty {
      opacity: 1;
      visibility: visible;
    }
  }
  .apos-rich-text-toolbar__inner ::v-deep > .apos-rich-text-editor__control {
    /* Addresses a Safari-only situation where it inherits the
      `::-webkit-scrollbar-button` 2px margin. */
    margin: 0;
  }

  .apos-rich-text-editor__editor ::v-deep span[data-comment] {
    background: rgba(172, 255, 47, 0.5);
    &::after {
      // content: " 💬";
      user-select: all;
    }
  }

  .apos-outer-comment {
    width: 300px;
    // margin-left: 100px;
  }

</style>
