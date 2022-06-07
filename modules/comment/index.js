module.exports = {
  extend: '@apostrophecms/piece-type',
  options: {
    label: 'Comment',
    // Additionally add a `pluralLabel` option if needed.
  },
  fields: {
    add: {
      startIndex: {
        type: 'integer',
        label: 'Start Index',
        required: false
      },
      endIndex: {
        type: 'integer',
        label: 'End Index',
        required: false
      },
      comment: {
        type: 'string',
        label: 'Comment',
        required: false
      },
      // TODO: Make a reference to the user id in aposUsersSafe collection
      commenterUsername: {
        type: 'string',
        label: 'Commenter username',
        required: false
      },
      richTextWidgetId: {
        type: 'string',
        required: false
      },
      pageId: {
        type: 'string',
        required: false
      }
    },
    group: {}
  },
  components(self) {
    return {
      async all(req, data) {
        // Setting up the query criteria
        const criteria = {
          // _id: { $eq: data. }
        };

        const comments = await self.find(req, criteria).toArray();

        return { comments };
      }
    }
  },
  // apiRoutes(self) {
  //   return {
  //     post: {

  //     }
  //   }
  // },
  methods (self) {
    return {
      async addNewComment(req, initialInfo) {
        let newComment = self.newInstance();
        newComment = {
          ...newComment,
          ...initialInfo
        };

        const insertResult = await self.insert(req, newComment);
        return insertResult;
      }
    }
  }
};