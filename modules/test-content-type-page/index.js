module.exports = {
  extend: '@apostrophecms/page-type',
  options: {
    label: 'Test Content Type Page'
  },
  fields: {
    add: {
      header_image: {
        type: 'area',
        options: {
          widgets: {
            '@apostrophecms/image': {}
          }
        }
      },
      body: {
        type: 'area',
        options: {
          widgets: {
            '@apostrophecms/rich-text': {}
          }
        }
      },
      boolean_test: {
        label: 'Boolean test label',
        type: 'boolean'
      },
      checkboxes_test: {
        label: 'Checkboxes test label',
        type: 'checkboxes',
        choices: [
          {
            label: 'Option 1',
            value: 'Option 1'
          },
          {
            label: 'Option 2',
            value: 'Option 2'
          },
          {
            label: 'Option 3',
            value: 'Option 3'
          }
        ]
      },
      color_test: {
        label: 'Color test label',
        type: 'color'
      }
    },
    group: {
      basics: {
        fields: [ 'title', 'header_image', 'body', 'boolean_test', 'checkboxes_test', 'color_test' ]
      }
    }
  }
};
