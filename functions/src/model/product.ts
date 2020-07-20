export interface Product {
    fID: string;
    pID: number;
    ProductName: string;
    ProductLocalName: string;
    ProductDescription: string;
    ProductDetail: string;
    ProductOwner: string;
    ProductKeys: string[];
    Category: string;
    SubCategory: string;
numberOfVariants: number;
    variants: Variant[];
}
export interface Variant {
    vID: number;
    ProductMRP: number;
    ProductPrice: number;
    quantity: number;
    metric: string;
    imageAvl: boolean;
    availStock: number;
    UploadedImages: ImageData[];
}
 

export interface ImageData{
    Progress: number;
file: string;
fileData: {};
fileUrl:ImgData;
}
export interface ImgData {
    data: Data;
    success: boolean;
    status: number;
}

export interface Image {
    filename: string;
    name: string;
    mime: string;
    extension: string;
    url: string;
    size: number;
}

export interface Thumb {
    filename: string;
    name: string;
    mime: string;
    extension: string;
    url: string;
    size: string;
}

export interface Medium {
    filename: string;
    name: string;
    mime: string;
    extension: string;
    url: string;
    size: string;
}

export interface Data {
    id: string;
    url_viewer: string;
    url: string;
    display_url: string;
    title: string;
    time: string;
    expiration: string;
    image: Image;
    thumb: Thumb;
    medium: Medium;
    delete_url: string;
}


