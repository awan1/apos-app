<template>
  <div class="apos-comment-control">
    <AposButton
      type="rich-text"
      @click="click"
      :class="{ 'apos-is-active': buttonActive }"
      :label="tool.label"
      :icon-only="!!tool.icon"
      :icon="tool.icon ? tool.icon : false"
      :modifiers="['no-border', 'no-motion']"
    />
    <div
      v-if="active"
      v-click-outside-element="close"
      class="apos-popover apos-comment-control__dialog"
      x-placement="bottom"
      :class="{
        'apos-is-triggered': active,
        'apos-has-selection': hasSelection
      }"
    >
      <AposContextMenuDialog
        menu-placement="bottom-start"
      >
        <div v-if="hasCommentOnOpen" class="apos-comment-control__remove">
          <AposButton
            type="quiet"
            @click="removeComment"
            label="apostrophe:removeComment"
          />
        </div>
        <AposSchema
          :schema="schema"
          v-model="value"
          :modifiers="formModifiers"
          :key="lastSelectionTime"
        />
        <footer class="apos-comment-control__footer">
          <AposButton
            type="default" label="apostrophe:cancel"
            @click="close"
            :modifiers="formModifiers"
          />
          <AposButton
            type="primary" label="apostrophe:save"
            @click="save"
            :modifiers="formModifiers"
          />
        </footer>
      </AposContextMenuDialog>
    </div>
  </div>
</template>

<script>

export default {
  name: 'AposTiptapComment',
  props: {
    name: {
      type: String,
      required: true
    },
    tool: {
      type: Object,
      required: true
    },
    editor: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      keepInBounds: true,
      href: null,
      target: null,
      active: false,
      hasCommentOnOpen: false,
      value: {
        data: {}
      },
      formModifiers: [ 'small', 'margin-micro' ],
      schema: [
        {
          name: 'comment',
          label: 'Add a comment',
          type: 'string',
          textarea: true,
        },
        // {
        //   name: 'target',
        //   label: 'Link Target',
        //   type: 'checkboxes',
        //   choices: [
        //     {
        //       label: 'Open link in new tab',
        //       value: '_blank'
        //     }
        //   ]
        // }
      ]
    };
  },
  computed: {
    buttonActive() {
      return this.value.data && this.value.data.href;
    },
    lastSelectionTime() {
      return this.editor.view.lastSelectionTime;
    },
    hasSelection() {
      const { state } = this.editor;
      const { selection } = this.editor.state;
      const { from, to } = selection;
      const text = state.doc.textBetween(from, to, '');
      return text !== '';
    },
    offset() {
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      return (rect.height + 15) + 'px';
    }
  },
  watch: {
    active(newVal) {
      if (newVal) {
        this.hasCommentOnOpen = !!(this.value.data.href);
        window.addEventListener('keydown', this.keyboardHandler);
      } else {
        window.removeEventListener('keydown', this.keyboardHandler);
      }
    },
    'editor.view.lastSelectionTime': {
      handler(newVal, oldVal) {
        this.populateFields();
      }
    },
    hasSelection(newVal, oldVal) {
      if (!newVal) {
        this.close();
      }
    }
  },
  methods: {
    removeComment() {
        // Figure out how to remove the comment from DB
      this.value.data = {};
    //   this.editor.commands.unsetLink();
      this.close();
    },
    click() {
      if (this.hasSelection) {
        this.active = !this.active;
        this.populateFields();
      }
    },
    close() {
      if (this.active) {
        this.active = false;
        this.editor.chain().focus();
      }
    },
    async save() {
      // cleanup incomplete submissions
      //   if (this.value.data.target && !this.value.data.href) {
      //     delete this.value.data.target;
      //   }
      //   this.editor.commands.setLink(this.value.data);
      //   this.active = false;
      this.$emit('saveComment', 
        this.value.data.comment,
      );

      this.value.data = {};
      this.close();
    },
    keyboardHandler(e) {
      if (e.keyCode === 27) {
        this.close();
      }
      if (e.keyCode === 13) {
        if (this.value.data.href || e.metaKey) {
          this.save();
          this.close();
          e.preventDefault();
        } else {
          e.preventDefault();
        }
      }
    },
    populateFields() {
    //   const attrs = this.editor.getAttributes('link');
    //   this.value.data = {};
    //   this.schema.forEach((item) => {
    //     this.value.data[item.name] = attrs[item.name] || '';
    //   });
    }
  }
};
</script>

<style lang="scss" scoped>
  .apos-comment-control {
    position: relative;
    display: inline-block;
  }

  .apos-comment-control__dialog {
    z-index: $z-index-modal;
    position: absolute;
    top: calc(100% + 5px);
    left: -15px;
    width: 250px;
    opacity: 0;
    pointer-events: none;
  }

  .apos-comment-control__dialog.apos-is-triggered.apos-has-selection {
    opacity: 1;
    pointer-events: auto;
  }

  .apos-is-active {
    background-color: var(--a-base-7);
  }

  .apos-comment-control__footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
  }

  .apos-comment-control__footer .apos-button__wrapper {
    margin-left: 7.5px;
  }

  .apos-comment-control__remove {
    display: flex;
    justify-content: flex-end;
  }

  // special schema style for this use
  .apos-comment-control ::v-deep .apos-field--target {
    .apos-field__label {
      display: none;
    }
  }

</style>
