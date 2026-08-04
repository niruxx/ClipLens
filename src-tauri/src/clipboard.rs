//! OS clipboard access via `arboard`, replacing the previous Python app's
//! per-OS `clipboard_backend.py` (win32 / pyperclip+Pillow / AppleScript /
//! xclip-wl-copy) with one cross-platform implementation.

use arboard::{Clipboard, ImageData};
use image::RgbaImage;
use sha2::{Digest, Sha256};
use std::borrow::Cow;

pub fn hash_text(text: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(text.as_bytes());
    format!("t:{:x}", hasher.finalize())
}

pub fn hash_bytes(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("i:{:x}", hasher.finalize())
}

pub fn read_text(clipboard: &mut Clipboard) -> Option<String> {
    clipboard.get_text().ok().filter(|s| !s.is_empty())
}

pub fn read_image(clipboard: &mut Clipboard) -> Option<RgbaImage> {
    let data = clipboard.get_image().ok()?;
    RgbaImage::from_raw(
        data.width as u32,
        data.height as u32,
        data.bytes.into_owned(),
    )
}

pub fn write_text(clipboard: &mut Clipboard, text: &str) -> Result<(), arboard::Error> {
    clipboard.set_text(text)
}

pub fn write_image(clipboard: &mut Clipboard, image: &RgbaImage) -> Result<(), arboard::Error> {
    let (width, height) = image.dimensions();
    let data = ImageData {
        width: width as usize,
        height: height as usize,
        bytes: Cow::Borrowed(image.as_raw()),
    };
    clipboard.set_image(data)
}
