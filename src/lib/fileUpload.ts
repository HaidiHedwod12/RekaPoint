import { supabase, supabaseAdmin } from './supabase';

export interface UserDocument {
  id: string;
  user_id: string;
  document_type: 'cv' | 'sertifikat';
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface UploadResult {
  success: boolean;
  document?: UserDocument;
  error?: string;
}

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/jpg'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const uploadUserDocument = async (
  userId: string,
  file: File,
  documentType: 'cv' | 'sertifikat'
): Promise<UploadResult> => {
  try {
    console.log('Starting file upload:', {
      userId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      documentType
    });

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Tipe file tidak didukung. Gunakan PDF, DOC, DOCX, JPG, atau PNG.'
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'Ukuran file terlalu besar. Maksimal 10MB.'
      };
    }

    // Generate unique file path
    const fileExtension = file.name.split('.').pop();
    const timestamp = Date.now();
    const fileName = `${documentType}_${userId}_${timestamp}.${fileExtension}`;
    const filePath = `${userId}/${documentType}/${fileName}`;

    console.log('Uploading to path:', filePath);

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return {
        success: false,
        error: 'Gagal mengupload file: ' + uploadError.message
      };
    }

    console.log('File uploaded successfully:', uploadData);

    // Delete existing document of same type for this user
    try {
      const { data: existingDocs } = await supabaseAdmin
        .from('user_documents')
        .select('file_path')
        .eq('user_id', userId)
        .eq('document_type', documentType);

      if (existingDocs && existingDocs.length > 0) {
        // Delete old files from storage
        const oldFilePaths = existingDocs.map(doc => doc.file_path);
        await supabase.storage
          .from('user-documents')
          .remove(oldFilePaths);

        // Delete old records from database
        await supabaseAdmin
          .from('user_documents')
          .delete()
          .eq('user_id', userId)
          .eq('document_type', documentType);

        console.log('Deleted existing documents:', oldFilePaths);
      }
    } catch (cleanupError) {
      console.warn('Could not cleanup old files:', cleanupError);
      // Continue anyway - not critical
    }

    // Save document info to database
    const { data: documentData, error: dbError } = await supabaseAdmin
      .from('user_documents')
      .insert([{
        user_id: userId,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type
      }])
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      
      // Cleanup uploaded file if database insert fails
      await supabase.storage
        .from('user-documents')
        .remove([filePath]);

      return {
        success: false,
        error: 'Gagal menyimpan info dokumen: ' + dbError.message
      };
    }

    console.log('Document saved to database:', documentData);

    return {
      success: true,
      document: documentData
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: 'Terjadi kesalahan saat mengupload: ' + (error instanceof Error ? error.message : 'Unknown error')
    };
  }
};

export const getUserDocuments = async (userId: string): Promise<UserDocument[]> => {
  try {
    console.log('Getting user documents for:', userId);

    const { data, error } = await supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error getting user documents:', error);
      throw error;
    }

    console.log('User documents retrieved:', data?.length);
    return data || [];

  } catch (error) {
    console.error('Error in getUserDocuments:', error);
    return [];
  }
};

export const deleteUserDocument = async (documentId: string): Promise<boolean> => {
  try {
    console.log('Deleting document:', documentId);

    // Get document info first
    const { data: document, error: getError } = await supabaseAdmin
      .from('user_documents')
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (getError || !document) {
      console.error('Document not found:', getError);
      return false;
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('user-documents')
      .remove([document.file_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue anyway - database cleanup is more important
    }

    // Delete from database
    const { error: dbError } = await supabaseAdmin
      .from('user_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return false;
    }

    console.log('Document deleted successfully');
    return true;

  } catch (error) {
    console.error('Error deleting document:', error);
    return false;
  }
};

export const getDocumentDownloadUrl = async (filePath: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from('user-documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error in getDocumentDownloadUrl:', error);
    return null;
  }
};

export const downloadDocument = async (filePath: string, fileName: string): Promise<void> => {
  try {
    const { data, error } = await supabase.storage
      .from('user-documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      return;
    }

    // Fetch file as blob
    const response = await fetch(data.signedUrl);
    const blob = await response.blob();

    // Create download link with custom filename
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error in downloadDocument:', error);
  }
};