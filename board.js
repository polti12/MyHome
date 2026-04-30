import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, query, orderBy, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyC9we7M4LK4-T9iPdrFAWpn9K-7Oa92oio",
    authDomain: "my-portfolio-board.firebaseapp.com",
    databaseURL: "https://my-portfolio-board-default-rtdb.firebaseio.com",
    projectId: "my-portfolio-board",
    storageBucket: "my-portfolio-board.firebasestorage.app",
    messagingSenderId: "324843253792",
    appId: "1:324843253792:web:b12eecd914acd00688cc45",
    measurementId: "G-3SLYHQP0CS"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const boardCollection = collection(db, "guestbook");

document.addEventListener('DOMContentLoaded', () => {
    // --- Board Logic ---
    const postForm = document.getElementById('post-form');
    const postList = document.getElementById('post-list');
    const toggleWriteBtn = document.getElementById('toggle-write-btn');
    const boardFormContainer = document.getElementById('board-form-container');
    window.currentEditDocId = null;
    window.currentPosts = {}; // To keep track of posts locally

    if (toggleWriteBtn && boardFormContainer) {
        toggleWriteBtn.addEventListener('click', () => {
            if (window.currentEditDocId) {
                alert("현재 다른 항목을 수정 중입니다. 수정 취소를 먼저 진행해주세요.");
                return;
            }

            if (boardFormContainer.style.display === 'none' || boardFormContainer.style.display === '') {
                boardFormContainer.style.display = 'block';
                toggleWriteBtn.textContent = '글쓰기 닫기';
                toggleWriteBtn.classList.remove('btn-primary');
                toggleWriteBtn.classList.add('btn-secondary');
            } else {
                boardFormContainer.style.display = 'none';
                toggleWriteBtn.textContent = '새 글 쓰기';
                toggleWriteBtn.classList.remove('btn-secondary');
                toggleWriteBtn.classList.add('btn-primary');
            }
        });
    }

    function escapeHTML(str) {
        return (str || '').toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async function loadPosts() {
        if (!postList) return;
        postList.innerHTML = '<p class="empty-msg" style="text-align:center; padding: 40px; color: var(--text-silver);">데이터를 불러오는 중입니다...</p>';
        
        try {
            const q = query(boardCollection, orderBy("date", "desc"));
            const querySnapshot = await getDocs(q);
            postList.innerHTML = '';
            
            if (querySnapshot.empty) {
                postList.innerHTML = '<p class="empty-msg" style="text-align:center; padding: 40px; border: 1px dashed rgba(255,255,255,0.2); border-radius: 4px; color: var(--text-silver);">등록된 게시글이 없습니다. 첫 번째 게시글을 작성해 보세요!</p>';
                return;
            }

            window.currentPosts = {};

            querySnapshot.forEach((docSnapshot) => {
                const post = docSnapshot.data();
                const docId = docSnapshot.id;
                window.currentPosts[docId] = post;

                const postEl = document.createElement('div');
                postEl.className = 'board-post-item reveal active';
                
                const likedPosts = JSON.parse(localStorage.getItem('liked_posts') || '{}');
                const isLiked = likedPosts[docId];
                
                const htmlContent = `
                    <div class="b-post-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <h4 style="display:inline-block; margin-right: 10px;">${escapeHTML(post.title)}</h4>
                        </div>
                        <div class="b-post-actions" style="min-width: 170px; text-align: right;">
                            <button onclick="likePost('${docId}')" class="btn ${isLiked ? 'btn-secondary' : 'btn-primary'}" 
                                    style="padding: 4px 10px; font-size: 0.75rem; margin-right: 5px; ${isLiked ? 'opacity: 0.6; pointer-events: none;' : ''}">
                                ${isLiked ? '✅ 추천완료' : '👍 추천'} ${post.likes || 0}
                            </button>
                            <button onclick="editPost('${docId}')" class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;">수정</button>
                            <button onclick="deletePost('${docId}')" class="btn" style="padding: 4px 10px; font-size: 0.75rem; background-color: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #ef4444; margin-left:5px;">삭제</button>
                        </div>
                    </div>
                    <div style="margin-bottom: 15px;"><span class="b-post-meta">👤 ${escapeHTML(post.name)} | 🕒 ${new Date(post.date).toLocaleString()}</span></div>
                    <div class="b-post-content">${escapeHTML(post.content).replace(/\n/g, '<br>')}</div>
                    
                    <div class="b-replies-section">
                        <h5>💬 답글 (${(post.replies || []).length})</h5>
                        <div class="b-replies-list" id="replies-${docId}">
                            ${(post.replies || []).map(r => `
                                <div class="b-reply-item">
                                    <strong>${escapeHTML(r.name)}</strong>: ${escapeHTML(r.text)} 
                                    <span class="b-reply-date">${new Date(r.date).toLocaleString()}</span>
                                </div>
                            `).join('')}
                        </div>
                        <form class="b-reply-form" onsubmit="addReply(event, '${docId}')">
                            <input type="text" placeholder="작성자명" required class="reply-name">
                            <input type="text" placeholder="답글을 입력하세요" required class="reply-text">
                            <button type="submit" class="btn btn-secondary" style="padding: 10px 20px; border-radius:4px; font-weight:600;">등록</button>
                        </form>
                    </div>
                `;
                postEl.innerHTML = htmlContent;
                postList.appendChild(postEl);
            });
        } catch (error) {
            console.error("데이터 불러오기 중 에러 발생:", error);
            postList.innerHTML = '<p class="empty-msg" style="text-align:center; padding: 40px; color: #ef4444;">데이터를 불러오는 중 오류가 발생했습니다. 개발자 도구의 콘솔을 확인해주세요.</p>';
        }
    }

    if (postForm) {
        postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const title = document.getElementById('title').value;
            const content = document.getElementById('content').value;

            try {
                if (window.currentEditDocId) {
                    const docRef = doc(db, "guestbook", window.currentEditDocId);
                    await updateDoc(docRef, {
                        name: name,
                        email: email,
                        password: password,
                        title: title,
                        content: content
                    });
                    alert('게시글이 깔끔하게 수정되었습니다!');
                    
                    window.currentEditDocId = null;
                    const submitBtn = document.querySelector('#post-form button[type="submit"]');
                    submitBtn.textContent = '게시글 등록';
                    submitBtn.style.backgroundColor = '';
                    document.getElementById('cancel-edit-btn').style.display = 'none';
                } else {
                    await addDoc(boardCollection, {
                        name: name,
                        email: email,
                        password: password,
                        title: title,
                        content: content,
                        date: new Date().toISOString(),
                        replies: [],
                        likes: 0
                    });
                    alert('게시글이 성공적으로 등록되었습니다!');
                }

                postForm.reset();
                if (boardFormContainer) boardFormContainer.style.display = 'none';
                if (toggleWriteBtn) {
                    toggleWriteBtn.textContent = '새 글 쓰기';
                    toggleWriteBtn.classList.remove('btn-secondary');
                    toggleWriteBtn.classList.add('btn-primary');
                    toggleWriteBtn.style.display = 'inline-block';
                }
                loadPosts();
            } catch (error) {
                console.error("저장 오류:", error);
                alert("게시글 저장에 실패했습니다. (콘솔 확인)");
            }
        });

        const submitBtn = document.querySelector('#post-form button[type="submit"]');
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.id = 'cancel-edit-btn';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = '수정 취소';
        cancelBtn.style.display = 'none';
        cancelBtn.style.marginLeft = '10px';
        cancelBtn.style.marginTop = '10px'; 
        
        cancelBtn.onclick = () => {
            window.currentEditDocId = null;
            postForm.reset();
            submitBtn.textContent = '게시글 등록';
            submitBtn.style.backgroundColor = '';
            cancelBtn.style.display = 'none';

            if (boardFormContainer) boardFormContainer.style.display = 'none';
            if (toggleWriteBtn) {
                toggleWriteBtn.textContent = '새 글 쓰기';
                toggleWriteBtn.classList.remove('btn-secondary');
                toggleWriteBtn.classList.add('btn-primary');
                toggleWriteBtn.style.display = 'inline-block';
            }
        };
        submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling);
    }

    // 전역 함수로 등록하여 onclick="editPost(...)" 등 요소가 호출할 수 있도록 함
    window.editPost = function(docId) {
        const post = window.currentPosts[docId];
        if (!post) return;
        
        const authKey = post.password ? post.password : post.email;
        const passCheck = prompt(post.password ? "게시물 수정을 위해 설정하신 비밀번호를 입력해주세요." : "이전 글의 수정을 위해 등록하신 이메일 주소를 입력해주세요.");
        if (passCheck !== authKey) {
            alert("입력하신 비밀번호(또는 단서)가 일치하지 않습니다!"); 
            return;
        }

        document.getElementById('name').value = post.name || '';
        document.getElementById('email').value = post.email || '';
        document.getElementById('password').value = post.password || '';
        document.getElementById('title').value = post.title || '';
        document.getElementById('content').value = post.content || '';
        
        window.currentEditDocId = docId;
        const submitBtn = document.querySelector('#post-form button[type="submit"]');
        submitBtn.textContent = '게시글 수정 완료';
        submitBtn.style.backgroundColor = '#10B981';
        document.getElementById('cancel-edit-btn').style.display = 'inline-block';

        if (boardFormContainer) boardFormContainer.style.display = 'block';
        if (toggleWriteBtn) {
            toggleWriteBtn.style.display = 'none'; 
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.deletePost = async function(docId) {
        const post = window.currentPosts[docId];
        if (!post) return;

        const authKey = post.password ? post.password : post.email;
        const passCheck = prompt(post.password ? "게시물을 삭제하기 위해 설정하신 비밀번호를 입력해주세요." : "이전 글의 삭제를 위해 등록하신 이메일 주소를 입력해주세요.");
        if (passCheck !== authKey) {
            alert("입력하신 비밀번호(또는 단서)가 일치하지 않습니다!"); 
            return;
        }

        if (confirm(`'${post.title}' 게시글을 정말로 완전히 삭제하시겠습니까?`)) {
            try {
                await deleteDoc(doc(db, "guestbook", docId));
                alert('성공적으로 삭제되었습니다.');
                loadPosts();
            } catch (e) {
                console.error("삭제 중 오류:", e);
                alert("삭제에 실패했습니다.");
            }
        }
    };

    window.likePost = async function(docId) {
        const post = window.currentPosts[docId];
        if (!post) return;

        const likedPosts = JSON.parse(localStorage.getItem('liked_posts') || '{}');
        if (likedPosts[docId]) {
            alert('이미 이 게시글을 추천하셨습니다!');
            return;
        }

        try {
            const newLikes = (post.likes || 0) + 1;
            await updateDoc(doc(db, "guestbook", docId), {
                likes: newLikes
            });

            likedPosts[docId] = true;
            localStorage.setItem('liked_posts', JSON.stringify(likedPosts));
            loadPosts();
        } catch (e) {
            console.error("추천 처리 중 오류:", e);
            alert("추천 저장 실패");
        }
    };

    window.addReply = async function(e, docId) {
        e.preventDefault();
        const post = window.currentPosts[docId];
        if (!post) return;

        const form = e.target;
        const name = form.querySelector('.reply-name').value;
        const text = form.querySelector('.reply-text').value;

        try {
            const newReplies = [...(post.replies || []), {
                name, text, date: new Date().toISOString()
            }];

            await updateDoc(doc(db, "guestbook", docId), {
                replies: newReplies
            });

            loadPosts();
        } catch (err) {
            console.error("댓글 등록 중 오류:", err);
            alert("댓글 등록에 실패했습니다.");
        }
    };

    // 최초 1회 실행하여 데이터베이스에서 게시글을 불러옵니다.
    loadPosts();
});
