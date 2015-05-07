# docker build -t kalabox/drush .

FROM kalabox/php-appserver:stable

# Install dependencies
# Install Composer
# Install some drushes
RUN \
  apt-get install -y git-core && \
  curl -sS https://getcomposer.org/installer | php && \
  mv composer.phar /usr/local/bin/composer && \
  ln -s /usr/local/bin/composer /usr/bin/composer && \
  git clone --depth 1 --branch 5.11.0 https://github.com/drush-ops/drush.git /usr/local/src/drush5 && \
  git clone --depth 1 --branch 6.6.0 https://github.com/drush-ops/drush.git /usr/local/src/drush6 && \
  git clone --depth 1 --branch 7.0.0-rc1 https://github.com/drush-ops/drush.git /usr/local/src/drush7 && \
  git clone --depth 1 --branch backdrush https://github.com/pirog/drush.git /usr/local/src/backdrush && \
  ln -s /usr/local/src/drush5/drush /usr/bin/drush5 && \
  ln -s /usr/local/src/drush6/drush /usr/bin/drush6 && \
  ln -s /usr/local/src/drush7/drush /usr/bin/drush7 && \
  cd /usr/local/src/drush7 && composer install --no-dev && \
  ln -s /usr/local/src/backdrush/drush /usr/bin/backdrush && \
  cd /usr/local/src/backdrush && composer install --no-dev

# Set up our kalabox specific stuff
COPY kdrush /usr/local/bin/kdrush
COPY ssh-config /root/.ssh/config

ENV PHP_VERSION 5.4.36

RUN \
  chmod +x /usr/local/bin/kdrush && \
  mkdir -p /root/.ssh && \
  ln -s /src/config/drush /root/.drush

ENTRYPOINT ["/usr/local/bin/kdrush"]
