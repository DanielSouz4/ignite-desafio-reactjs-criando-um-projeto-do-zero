import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import { Comments } from '../../components/Comments';

import { getPrismicClient } from '../../services/prismic';
import { RichText } from 'prismic-dom';
import Head from 'next/head';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import Prismic from '@prismicio/client';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import { useRouter } from 'next/router';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  navegation: {
    prevPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
    nextPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
  };
}

export default function Post({ post, preview, navegation }: PostProps) {
  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  const totalWords = post.data.content.reduce((acc, contentItem) => {
    acc += contentItem.heading.split(' ').length;

    const totalBody = contentItem.body.map(item => item.text.split(' ').length);
    totalBody.map(item => (acc += item));

    return acc;
  }, 0);

  const estimatedReadingTime = Math.ceil(totalWords / 200);

  return (
    <>
      <Head>
        <title>{post.data.title} | spacetraveling</title>
      </Head>

      <div className={styles.bannerCotainer}>
        <img src={post.data.banner.url} alt="banner" />
      </div>

      <main className={styles.container}>
        <article className={styles.post}>
          <h1>{post.data.title}</h1>

          <div className={styles.info}>
            <div>
              <time>
                <FiCalendar />
                <span>{post.first_publication_date}</span>
              </time>

              <p className={styles.author}>
                <FiUser />
                <span>{post.data.author}</span>
              </p>

              <p className={styles.estimatedTime}>
                <FiClock />
                <span>{`${estimatedReadingTime}`} min</span>
              </p>
            </div>

            {post.first_publication_date !== post.last_publication_date && (
              <i>{post.last_publication_date}</i>
            )}
          </div>

          {post.data.content.map(content => (
            <div key={content.heading} className={styles.Postcontent}>
              <h2>{content.heading}</h2>
              <div
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              />
            </div>
          ))}
        </article>
      </main>
      <footer className={styles.footerContainer}>
        <div className={styles.divider}></div>

        <div className={styles.navegation}>
          {navegation?.prevPost.length > 0 && (
            <div className={styles.postAnterior}>
              <strong>{navegation.prevPost[0].data.title}</strong>
              <a href={`/post/${navegation.prevPost[0].uid}`}>Post anterior</a>
            </div>
          )}

          {navegation.nextPost.length > 0 && (
            <div className={styles.proximoPost}>
              <strong>{navegation.nextPost[0].data.title}</strong>
              <a href={`/post/${navegation.nextPost[0].uid}`}>Próximo post</a>
            </div>
          )}
        </div>

        <Comments />

        {preview && (
          <aside className={styles.preview}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </footer>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts'),
  ]);

  const paths = posts.results.map(post => {
    return {
      params: { slug: post.uid },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const prevPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    }
  );

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.last_publication_date desc]',
    }
  );

  const post = {
    uid: response.uid,
    first_publication_date: format(
      new Date(response.first_publication_date),
      'd LLL y',
      {
        locale: ptBR,
      }
    ),
    last_publication_date: format(
      new Date(response.last_publication_date),
      "'* editado em ' d LLL y', às' p",
      {
        locale: ptBR,
      }
    ),
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  return {
    props: {
      post,
      preview,
      navegation: {
        prevPost: prevPost?.results,
        nextPost: nextPost?.results,
      },
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
