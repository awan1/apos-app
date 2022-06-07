<template>
    <div>
        <article
            class="external-comment-area"
            v-for="(comment, i) in allComments"
            :key="i + 'external_comment'"
            :class="[`${comment.jsonComments.uuid === activeCommentsInstance.uuid ? 'active-comment' : 'inactive-comment'}`]"
            @click.stop.prevent="focusContent(comment.from, comment.to)"
        >
            <article>{{ i + 1 }}. "{{ comment.text }}"</article>
            <article
                v-for="(jsonComment, j) in comment.jsonComments.comments"
                :key="`${j}_${Math.random()}`"
            >
                <div class="comment-metadata">
                    <strong>{{ jsonComment.username }}</strong>
                    <span>{{ formatDate(jsonComment.time) }}</span>
                </div>
                <span>{{ jsonComment.content }}</span>
            </article>

            <!-- <section>
                <textarea
                    v-model="commentText"
                    cols="30"
                    rows="3"
                    placeholder="Add comment..."
                    :ref="el => { textareaRefs[comment.jsonComments.uuid] = el }"
                ></textarea>

                <section>
                    <button @click="() => (commentText = '')">Clear</button>
                    <button @click="saveComment">Add</button>
                </section>
            </section> -->
        </article>
    </div>
</template>

<script>
import format from 'date-fns/format';

export default {
    name: 'AposOuterComment',
    components: {},
    props: {
        allComments: {
            type: Array,
            required: true
        },
        activeCommentsInstance: {
            type: Object,
            required: true
        },
        focusContent: {
            type: Function,
            required: true
        },
    },
    data() {
        return {
            commentText: '',
            textareaRefs: {}
        };
    },
    watch: {
        activeCommentInstanceUuid(val) {
            setTimeout(() => {
                if (!val) {
                    return;
                }

                const activeTextArea = this.textareaRefs[val];
                if (activeTextArea) {
                    activeTextArea.focus();
                }
            }, 100);
        }
    },
    computed: {
        activeCommentInstanceUuid() {
            return this.activeCommentsInstance.uuid;
        }
    },
    methods: {
        formatDate(date) {
            const dateTimeFormat = 'dd.MM.yyyy HH:mm';
            return !!date ? format(new Date(date), dateTimeFormat): null;
        },
        saveComment() {
            console.log(this.allComments);
            this.$emit('saveComment', this.commentText);
            this.commentText = '';
        }
    }
}
</script>

<style lang="scss">
.external-comment-area {
    border: 1px solid;
    border-radius: 5px;
    padding: 16px;
    // margin-left: -30px;
    margin-right: 54px;
    margin-top: 8px;
}

.active-comment {
    border: 4px solid;
}

.comment-metadata {
    font-size: 12px;
    margin-top: 6px;
    margin-bottom: 6px;
}
</style>