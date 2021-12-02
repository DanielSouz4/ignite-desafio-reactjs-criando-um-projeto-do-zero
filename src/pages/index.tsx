import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Prismic from '@prismicio/client';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { getPrismicClient } from '../services/prismic';
import { FiCalendar, FiUser } from 'react-icons/fi';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import { useState } from 'react';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

export default function Home({ postsPagination, preview }: HomeProps) {
  const [posts, setPosts] = useState(postsPagination.results);
  const [nextPage, setNextPage] = useState(postsPagination.next_page);

  async function handleLoadMorePosts() {
    if (nextPage === null) {
      return;
    }

    const responseNextPage = await fetch(`${nextPage}`).then(response =>
      response.json()
    );

    setNextPage(responseNextPage.next_page);
    setPosts([...posts, ...responseNextPage.results]);
  }

  return (
    <>
      <Head>
        <title>Home | spacetraveling</title>
      </Head>

      <main className={styles.mainContainer}>
        <div className={styles.posts}>
          {posts.map(post => (
            <Link key={post.uid} href={`/post/${post.uid}`}>
              <a>
                <strong>{post.data.title}</strong>
                <p>{post.data.subtitle}</p>
                <div>
                  <time>
                    <FiCalendar />
                    <span>
                      {format(
                        new Date(post.first_publication_date),
                        'd LLL y',
                        {
                          locale: ptBR,
                        }
                      )}
                    </span>
                  </time>
                  <p>
                    <FiUser />
                    <span>{post.data.author}</span>
                  </p>
                </div>
              </a>
            </Link>
          ))}

          {nextPage && (
            <button type="button" onClick={handleLoadMorePosts}>
              Carregar mais posts
            </button>
          )}
        </div>
      </main>

      {preview && (
        <aside className={styles.preview}>
          <Link href="/api/exit-preview">
            <a>Sair do modo Preview</a>
          </Link>
        </aside>
      )}
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      fetch: ['publication.title', 'publication.content'],
      pageSize: 3,
      orderings: '[document.last_publication_date desc]',
      ref: previewData?.ref ?? null,
    }
  );

  const postsPagination = {
    next_page: postsResponse.next_page,
    results: postsResponse.results,
  };

  return {
    props: {
      postsPagination,
      preview,
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
