<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet
  version="3.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom"
>
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <link rel="icon" href="/assets/favicon.ico" type="image/x-icon"/>
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png"/>
        <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16x16.png"/>
        <link rel="stylesheet" href="/assets/style.css?v========================" />
        <title>RSS Feed | <xsl:value-of select="/rss/channel/title"/></title>
      </head>
      <body>
        <h1>Recent blog posts</h1>
        <main>
        <xsl:for-each select="/rss/channel/item">
          <div>
          <div>
            <xsl:value-of select="pubDate"/>
          </div>
          <h2>
            <a target="_blank">
              <xsl:attribute name="href">
                <xsl:value-of select="atom:link/@href"/>
              </xsl:attribute>
              <xsl:value-of select="title"/>
            </a>
          </h2>
          <xsl:if test="description">
            <p>
              <xsl:value-of select="description"/>
            </p>
          </xsl:if>
          </div>
        </xsl:for-each>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
