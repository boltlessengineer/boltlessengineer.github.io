/*
How to customize theme?

```
<bsky-comments
    href=""
    merge-op
/>
```

*/
function filterOutEmojiOnlyComment(thread) {
    const emojiRegex = /^[\p{Emoji}\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u;
    return !emojiRegex.test(thread.post.record.text);
}
function createBskyComment(thread) {
    const avatarImgEl = (() => {
        const el = document.createElement('img');
        el.classList.add('avatar');
        el.alt = "avatar"
        el.src = thread.post.author.avatar;
        return el;
    })();
    const profileEl = (() => {
        const el = document.createElement('p');
        const profileNameEl = (() => {
            const el = document.createElement('span');
            el.textContent = thread.post.author.displayName;
            return el;
        })();
        const handleEl = (() => {
            const el = document.createElement('a');
            el.href = `https://bsky.app/profile/${thread.post.author.did}`;
            el.textContent = `@${thread.post.author.handle}`;
            return el;
        })();
        el.classList.add('comment__profile');
        el.appendChild(profileNameEl);
        el.appendChild(document.createTextNode(' '));
        el.appendChild(handleEl);
        return el;
    })();
    const contentEl = (() => {
        const el = document.createElement('p');
        el.style.whiteSpace = 'pre-wrap';
        el.textContent = thread.post.record.text;
        return el;
    })();
    const metaEl = (() => {
        const el = document.createElement('div');
        el.classList.add('comment__meta')
        el.textContent = [
            `${thread.post.replyCount ?? 0} replies`,
            `${thread.post.repostCount ?? 0} reposts`,
            `${thread.post.likeCount ?? 0} likes`,
        ].join(' ');
        return el;
    })();
    const commentEl = (() => {
        const el = document.createElement('div');
        el.classList.add('comment');
        el.style.display = 'flex';
        el.appendChild(avatarImgEl);
        el.appendChild((() => {
            const el = document.createElement('div');
            el.appendChild((() => {
                const el = document.createElement('div');
                el.classList.add('comment__body');
                el.appendChild(profileEl);
                el.appendChild(contentEl);
                return el;
            })());
            el.appendChild(metaEl);
            return el;
        })());
        return el;
    })();

    const rootEl = document.createElement('li');
    rootEl.appendChild(commentEl);

    const parentDid = thread.post.record.reply.parent.uri.split('/')[2];
    if (thread.post.author.did == parentDid) {
        rootEl.classList.add("op");
    }

    if (thread.replies) {
        const replies = thread.replies
            .filter(filterOutEmojiOnlyComment)
            .reduce((acc, replyThread) => {
                if (replyThread.post.author.did !== thread.post.author.did) {
                    acc[0].push(replyThread);
                } else {
                    acc[1].push(replyThread);
                }
                return acc;
            }, [[], []])
            .flat();
        if (replies.length > 0) {
            const repliesEl = (() => {
                const el = document.createElement('ul');
                replies.forEach(replyThread => {
                    el.appendChild(createBskyComment(replyThread))
                })
                return el;
            })();
            rootEl.appendChild(repliesEl);
        }
    }
    return rootEl;
}
class BskyCommentSection extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.repliesEl = document.createElement('ul');
        this.thread = null;
        this.visibleCount = 0;
    }
    connectedCallback() {
        const rootEl = document.createElement('div');
        this.shadowRoot.appendChild(rootEl);
        rootEl.innerHTML = `<style> @import url("/bsky-comments.css?v=0.1"); </style>`;
        const uri = this.getAttribute('href')
        // HACK: use regex match instead
        const [, , , , did, _, rkey] = uri.split('/');
        const atUri = `at://${did}/app.bsky.feed.post/${rkey}`;

        const metaEl = (() => {
            const el = document.createElement('div');
            el.textContent = 'loading...';
            return el;
        })();
        rootEl.appendChild(metaEl)
        rootEl.appendChild(document.createElement('hr'))
        rootEl.appendChild(this.repliesEl);
        this.getPostThread(atUri).then(thread => {
            const postUri = `https://bsky.app/profile/${thread.post.author.did}/post/${thread.post.uri.split("/").pop()}`
            this.replies = thread.replies
                .filter(filterOutEmojiOnlyComment)
                //.sort();
            metaEl.innerHTML = `<p>
                ${thread.post.likeCount ?? 0} likes
                ${thread.post.repostCount ?? 0} reposts
                ${this.replies.length ?? 0} replies
            </p>
            <p>
                Reply on Bluesky <a href="${postUri}">here</a> to join the conversation.
            </p>`;
            this.updateElements();
            if (this.visibleCount >= this.replies.length)
                return
            rootEl.appendChild((() => {
                const el = document.createElement('button');
                el.classList.add('show-more-btn');
                el.textContent = 'Show more comments';
                el.onclick = () => {
                    this.updateElements();
                    if (this.visibleCount >= this.replies.length) {
                        el.style.display = 'none';
                    }
                }
                return el;
            })());
        })
    }
    updateElements() {
        const newVisibleCount = this.visibleCount + 10
        this.replies
            .slice(this.visibleCount, newVisibleCount)
            .forEach(replyThread => {
                this.repliesEl.appendChild(createBskyComment(replyThread))
            });
        this.visibleCount = newVisibleCount;
    }
    async getPostThread(uri) {
        const params = new URLSearchParams({ uri });
        const res = await fetch(
            "https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?" + params.toString(),
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                cache: 'no-store',
            },
        );

        if (!res.ok) {
            console.error(await res.text());
            throw new Error("Failed to fetch post thread");
        }

        const data = await res.json()
        console.log(data.thread);
        return data.thread;
    }
}
customElements.define('bsky-comments', BskyCommentSection);
