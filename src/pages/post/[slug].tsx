import { GetStaticPaths, GetStaticProps } from 'next';

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
import { useEffect } from 'react';

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
}

export default function Post({ post }: PostProps) {
  useEffect(() => {
    let script = document.createElement('script');
    let anchor = document.getElementById('inject-comments-for-uterances');
    script.setAttribute('src', 'https://utteranc.es/client.js');
    script.setAttribute('crossorigin', 'anonymous');
    script.setAttribute('async', true);
    script.setAttribute('repo', 'DanielSouz4/spacetraveling-comments');
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('theme', 'photon-dark');
    anchor.appendChild(script);
  }, []);

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

            <i>{post.last_publication_date}</i>
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
          <div className={styles.postAnterior}>
            <strong>Como utilizar Hooks</strong>
            <a href="#">Post anterior</a>
          </div>

          <div className={styles.proximoPost}>
            <strong>Criando um app CRA do Zero</strong>
            <a href="#">Próximo post</a>
          </div>
        </div>
        <div
          className={styles.commments}
          id="inject-comments-for-uterances"
        ></div>
        <button className={styles.preview}>Sair do modo Preview</button>
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

export const getStaticProps: GetStaticProps = async context => {
  const { slug } = context.params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {});

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
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
