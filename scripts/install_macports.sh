mkdir -p $HOME/opt/mports
cd $HOME/opt/mports
wget https://github.com/macports/macports-base/releases/download/v2.9.1/MacPorts-2.9.1.tar.gz
tar -xzvf MacPorts-2.9.1.tar.gz
cd $HOME/opt/mports/MacPorts-2.9.1
./configure --prefix=$HOME/macports --with-install-user=`id -un` --with-install-group=`id -gn`
make
make install
make distclean
export PATH=$HOME/macports/bin:$HOME/macports/sbin:$PATH
export MACPORTS_HOME=$HOME/macports
port selfupdate
port install llvm-18
