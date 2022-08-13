class vBay < Formula
  desc "A simple shopping site"
  homepage "https://github.com/VicVer09/homebrew-vbay"
  url "https://github.com/VicVer09/homebrew-vbay/releases/download/v0.0.1/vbay-macos-x64.tar.gz"
  sha256 "012cac0a43631fcf7887df4d85e6e193f0e9961995c72f76b3712b8e2cba1169"
  version "v0.0.1"
  def install
    bin.install "vbay"
  end
end
